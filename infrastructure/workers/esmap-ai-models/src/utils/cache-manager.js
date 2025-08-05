/**
 * Cache Manager
 * Handles caching of inference results for performance optimization
 */

export class CacheManager {
  constructor(kvNamespace) {
    this.kv = kvNamespace;
    this.defaultTTL = 3600; // 1 hour
  }

  generateKey(data) {
    // Create a deterministic cache key from request data
    const keyData = {
      modelId: data.modelId,
      input: data.input,
      options: data.options || {}
    };
    
    // Simple hash function for demo - in production use proper hashing
    const keyString = JSON.stringify(keyData);
    return `inference:${this.simpleHash(keyString)}`;
  }

  async get(key) {
    if (!this.kv) return null;
    
    try {
      const cached = await this.kv.get(key, 'json');
      if (cached) {
        console.log(`Cache hit for key: ${key}`);
        return cached;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    
    return null;
  }

  async set(key, value, ttl) {
    if (!this.kv) return;
    
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl || this.defaultTTL
      });
      console.log(`Cache set for key: ${key}`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key) {
    if (!this.kv) return;
    
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(pattern) {
    if (!this.kv) return;
    
    try {
      // List keys matching pattern
      const list = await this.kv.list({ prefix: pattern });
      
      // Delete in batches
      const deletePromises = list.keys.map(key => this.kv.delete(key.name));
      await Promise.all(deletePromises);
      
      console.log(`Cleared ${list.keys.length} cache entries`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}