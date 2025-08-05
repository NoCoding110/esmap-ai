/**
 * Duplicate Detection and Handling System
 */

// Cloudflare Workers uses Web Crypto API
import { 
  DataRecord, 
  DuplicateDetectionConfig 
} from '../types';

export interface DuplicateResult {
  isDuplicate: boolean;
  existingRecordId?: string;
  similarity?: number;
  strategy: string;
}

export class DuplicateDetector {
  private recordHashes: Map<string, string> = new Map();
  private recordKeys: Map<string, string> = new Map();
  private config: DuplicateDetectionConfig;

  constructor(config: DuplicateDetectionConfig) {
    this.config = config;
  }

  /**
   * Check if a record is a duplicate
   */
  async checkDuplicate(record: DataRecord, existingRecords?: DataRecord[]): Promise<DuplicateResult> {
    switch (this.config.strategy) {
      case 'hash':
        return await this.checkHashDuplicate(record);
      
      case 'key':
        return this.checkKeyDuplicate(record);
      
      case 'similarity':
        return await this.checkSimilarityDuplicate(record, existingRecords || []);
      
      default:
        return { isDuplicate: false, strategy: 'none' };
    }
  }

  /**
   * Handle duplicate record based on configured action
   */
  async handleDuplicate(
    newRecord: DataRecord, 
    existingRecord: DataRecord
  ): Promise<DataRecord | null> {
    switch (this.config.action) {
      case 'skip':
        return null;
      
      case 'replace':
        return this.replaceRecord(newRecord, existingRecord);
      
      case 'merge':
        return this.mergeRecords(newRecord, existingRecord);
      
      case 'version':
        return this.versionRecord(newRecord, existingRecord);
      
      default:
        return null;
    }
  }

  /**
   * Check duplicate using hash of entire record
   */
  private async checkHashDuplicate(record: DataRecord): Promise<DuplicateResult> {
    const hash = await this.generateRecordHash(record);
    const existingId = this.recordHashes.get(hash);

    if (existingId) {
      return {
        isDuplicate: true,
        existingRecordId: existingId,
        strategy: 'hash'
      };
    }

    // Store hash for future checks
    this.recordHashes.set(hash, record.id);

    return {
      isDuplicate: false,
      strategy: 'hash'
    };
  }

  /**
   * Check duplicate using specified key fields
   */
  private checkKeyDuplicate(record: DataRecord): DuplicateResult {
    if (!this.config.keyFields || this.config.keyFields.length === 0) {
      throw new Error('Key fields must be specified for key-based duplicate detection');
    }

    const key = this.generateRecordKey(record, this.config.keyFields);
    const existingId = this.recordKeys.get(key);

    if (existingId) {
      return {
        isDuplicate: true,
        existingRecordId: existingId,
        strategy: 'key'
      };
    }

    // Store key for future checks
    this.recordKeys.set(key, record.id);

    return {
      isDuplicate: false,
      strategy: 'key'
    };
  }

  /**
   * Check duplicate using similarity comparison
   */
  private async checkSimilarityDuplicate(
    record: DataRecord, 
    existingRecords: DataRecord[]
  ): Promise<DuplicateResult> {
    const threshold = this.config.similarityThreshold || 0.9;
    let bestMatch: { id: string; similarity: number } | null = null;

    for (const existingRecord of existingRecords) {
      const similarity = this.calculateSimilarity(record, existingRecord);
      
      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id: existingRecord.id, similarity };
        }
      }
    }

    if (bestMatch) {
      return {
        isDuplicate: true,
        existingRecordId: bestMatch.id,
        similarity: bestMatch.similarity,
        strategy: 'similarity'
      };
    }

    return {
      isDuplicate: false,
      strategy: 'similarity'
    };
  }

  /**
   * Generate hash for a record using Web Crypto API
   */
  private async generateRecordHash(record: DataRecord): Promise<string> {
    const dataString = JSON.stringify(record.data, Object.keys(record.data).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Generate key from specified fields
   */
  private generateRecordKey(record: DataRecord, keyFields: string[]): string {
    const keyValues = keyFields.map(field => {
      const value = this.getNestedValue(record.data, field);
      return value !== undefined ? String(value) : 'null';
    });

    return keyValues.join('|');
  }

  /**
   * Calculate similarity between two records
   */
  private calculateSimilarity(record1: DataRecord, record2: DataRecord): number {
    const keys1 = Object.keys(record1.data);
    const keys2 = Object.keys(record2.data);
    const allKeys = new Set([...keys1, ...keys2]);

    let matchingValues = 0;
    let totalComparisons = 0;

    for (const key of allKeys) {
      if (record1.data[key] !== undefined && record2.data[key] !== undefined) {
        totalComparisons++;
        
        if (this.compareValues(record1.data[key], record2.data[key])) {
          matchingValues++;
        }
      }
    }

    return totalComparisons > 0 ? matchingValues / totalComparisons : 0;
  }

  /**
   * Compare two values for similarity
   */
  private compareValues(value1: any, value2: any): boolean {
    // Exact match
    if (value1 === value2) return true;

    // Both null/undefined
    if (!value1 && !value2) return true;

    // Type mismatch
    if (typeof value1 !== typeof value2) return false;

    // String comparison with normalization
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      const normalized1 = value1.toLowerCase().trim();
      const normalized2 = value2.toLowerCase().trim();
      
      // Exact match after normalization
      if (normalized1 === normalized2) return true;
      
      // Fuzzy match for strings (simple Levenshtein distance check)
      const distance = this.levenshteinDistance(normalized1, normalized2);
      const maxLength = Math.max(normalized1.length, normalized2.length);
      const similarity = 1 - (distance / maxLength);
      
      return similarity >= 0.9;
    }

    // Number comparison with tolerance
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      const tolerance = 0.001;
      return Math.abs(value1 - value2) <= tolerance;
    }

    // Array comparison
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) return false;
      return value1.every((item, index) => this.compareValues(item, value2[index]));
    }

    // Object comparison
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => this.compareValues(value1[key], value2[key]));
    }

    return false;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Replace existing record with new one
   */
  private replaceRecord(newRecord: DataRecord, existingRecord: DataRecord): DataRecord {
    return {
      ...newRecord,
      metadata: {
        ...newRecord.metadata,
        lineage: [
          ...existingRecord.metadata.lineage,
          ...newRecord.metadata.lineage,
          {
            step: 'deduplication',
            timestamp: new Date(),
            operation: 'replace',
            inputRecords: [existingRecord.id, newRecord.id],
            outputRecords: [newRecord.id]
          }
        ]
      }
    };
  }

  /**
   * Merge two records
   */
  private mergeRecords(newRecord: DataRecord, existingRecord: DataRecord): DataRecord {
    const mergedData = { ...existingRecord.data };

    // Merge data, preferring non-null values from new record
    for (const [key, value] of Object.entries(newRecord.data)) {
      if (value !== null && value !== undefined && value !== '') {
        mergedData[key] = value;
      }
    }

    return {
      ...newRecord,
      data: mergedData,
      metadata: {
        ...newRecord.metadata,
        lineage: [
          ...existingRecord.metadata.lineage,
          ...newRecord.metadata.lineage,
          {
            step: 'deduplication',
            timestamp: new Date(),
            operation: 'merge',
            inputRecords: [existingRecord.id, newRecord.id],
            outputRecords: [newRecord.id]
          }
        ]
      }
    };
  }

  /**
   * Create versioned record
   */
  private versionRecord(newRecord: DataRecord, existingRecord: DataRecord): DataRecord {
    const version = this.extractVersion(existingRecord.id) + 1;
    const versionedId = `${newRecord.id}_v${version}`;

    return {
      ...newRecord,
      id: versionedId,
      metadata: {
        ...newRecord.metadata,
        lineage: [
          ...newRecord.metadata.lineage,
          {
            step: 'deduplication',
            timestamp: new Date(),
            operation: 'version',
            inputRecords: [existingRecord.id, newRecord.id],
            outputRecords: [versionedId]
          }
        ]
      }
    };
  }

  /**
   * Extract version number from ID
   */
  private extractVersion(id: string): number {
    const match = id.match(/_v(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Clear stored hashes and keys (for memory management)
   */
  clearCache(): void {
    this.recordHashes.clear();
    this.recordKeys.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hashes: number; keys: number } {
    return {
      hashes: this.recordHashes.size,
      keys: this.recordKeys.size
    };
  }
}