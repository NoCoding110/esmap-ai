/**
 * Cost Optimization for R2 Storage
 * Implements intelligent strategies to minimize storage costs while maintaining data availability
 */

import { FileMetadata, FileCategory, StorageStats, RetentionPolicy } from './types';

export interface CostOptimizationReport {
  currentCosts: {
    storage: number;
    requests: number;
    bandwidth: number;
    total: number;
  };
  optimizations: {
    compressionSavings: number;
    deduplicationSavings: number;
    archivalSavings: number;
    cleanupSavings: number;
    totalSavings: number;
  };
  recommendations: string[];
  actions: OptimizationAction[];
}

export interface OptimizationAction {
  type: 'compress' | 'deduplicate' | 'archive' | 'delete' | 'migrate';
  fileIds: string[];
  estimatedSavings: number;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class CostOptimizer {
  private metadataDB: D1Database;
  private bucket: R2Bucket;

  constructor(metadataDB: D1Database, bucket: R2Bucket) {
    this.metadataDB = metadataDB;
    this.bucket = bucket;
  }

  /**
   * Generate comprehensive cost optimization report
   */
  async generateOptimizationReport(): Promise<CostOptimizationReport> {
    const currentStats = await this.getCurrentStorageStats();
    const currentCosts = this.calculateCurrentCosts(currentStats);
    
    const optimizations = await this.identifyOptimizations();
    const recommendations = this.generateRecommendations(optimizations);
    const actions = await this.generateOptimizationActions();

    return {
      currentCosts,
      optimizations,
      recommendations,
      actions
    };
  }

  /**
   * Execute automatic cost optimizations
   */
  async executeOptimizations(maxActions: number = 100): Promise<{
    executed: number;
    savings: number;
    errors: string[];
  }> {
    const actions = await this.generateOptimizationActions();
    const highPriorityActions = actions
      .filter(action => action.priority === 'high')
      .slice(0, maxActions);

    let executed = 0;
    let totalSavings = 0;
    const errors: string[] = [];

    for (const action of highPriorityActions) {
      try {
        await this.executeAction(action);
        executed++;
        totalSavings += action.estimatedSavings;
      } catch (error) {
        errors.push(`Failed to execute ${action.type} for ${action.fileIds.length} files: ${error}`);
      }
    }

    return {
      executed,
      savings: totalSavings,
      errors
    };
  }

  /**
   * Identify files for compression
   */
  async identifyCompressionCandidates(): Promise<FileMetadata[]> {
    const query = `
      SELECT * FROM file_metadata 
      WHERE compression_info IS NULL 
      AND size > 1048576  -- Files larger than 1MB
      AND mime_type IN ('application/json', 'text/csv', 'text/plain', 'application/xml')
      AND category NOT IN ('backup', 'temporary')
      ORDER BY size DESC
      LIMIT 1000
    `;

    const results = await this.metadataDB.prepare(query).all();
    return results.results.map(row => this.rowToMetadata(row));
  }

  /**
   * Identify duplicate files for deduplication
   */
  async identifyDuplicates(): Promise<{ checksum: string; files: FileMetadata[] }[]> {
    const query = `
      SELECT json_extract(checksums, '$.sha256') as checksum, 
             GROUP_CONCAT(id) as file_ids,
             COUNT(*) as duplicate_count
      FROM file_metadata 
      WHERE category NOT IN ('temporary', 'backup')
      GROUP BY json_extract(checksums, '$.sha256')
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC, 
               SUM(size) DESC
      LIMIT 500
    `;

    const results = await this.metadataDB.prepare(query).all();
    const duplicateGroups: { checksum: string; files: FileMetadata[] }[] = [];

    for (const row of results.results) {
      const fileIds = (row.file_ids as string).split(',');
      const files: FileMetadata[] = [];

      for (const fileId of fileIds) {
        const fileQuery = 'SELECT * FROM file_metadata WHERE id = ?';
        const fileResult = await this.metadataDB.prepare(fileQuery).bind(fileId).first();
        if (fileResult) {
          files.push(this.rowToMetadata(fileResult));
        }
      }

      if (files.length > 1) {
        duplicateGroups.push({
          checksum: row.checksum as string,
          files
        });
      }
    }

    return duplicateGroups;
  }

  /**
   * Identify files for archival
   */
  async identifyArchivalCandidates(): Promise<FileMetadata[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = `
      SELECT * FROM file_metadata 
      WHERE last_modified < ?
      AND category NOT IN ('backup', 'temporary', 'cache')
      AND (retention_policy IS NULL OR 
           json_extract(retention_policy, '$.type') != 'permanent')
      ORDER BY last_modified ASC, size DESC
      LIMIT 2000
    `;

    const results = await this.metadataDB.prepare(query)
      .bind(thirtyDaysAgo.toISOString())
      .all();

    return results.results.map(row => this.rowToMetadata(row));
  }

  /**
   * Identify files for cleanup/deletion
   */
  async identifyCleanupCandidates(): Promise<FileMetadata[]> {
    const cleanupCandidates: FileMetadata[] = [];

    // Temporary files older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const tempQuery = `
      SELECT * FROM file_metadata 
      WHERE category = 'temporary' 
      AND uploaded_at < ?
      ORDER BY uploaded_at ASC
    `;

    const tempResults = await this.metadataDB.prepare(tempQuery)
      .bind(sevenDaysAgo.toISOString())
      .all();

    cleanupCandidates.push(...tempResults.results.map(row => this.rowToMetadata(row)));

    // Cache files older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cacheQuery = `
      SELECT * FROM file_metadata 
      WHERE category = 'cache' 
      AND uploaded_at < ?
      ORDER BY uploaded_at ASC
    `;

    const cacheResults = await this.metadataDB.prepare(cacheQuery)
      .bind(thirtyDaysAgo.toISOString())
      .all();

    cleanupCandidates.push(...cacheResults.results.map(row => this.rowToMetadata(row)));

    // Files exceeding category quotas
    const quotaExceedingFiles = await this.identifyQuotaExceedingFiles();
    cleanupCandidates.push(...quotaExceedingFiles);

    return cleanupCandidates;
  }

  /**
   * Calculate storage costs based on current usage
   */
  private calculateCurrentCosts(stats: StorageStats): {
    storage: number;
    requests: number;
    bandwidth: number;
    total: number;
  } {
    // Cloudflare R2 pricing (2024)
    const storageCostPerGB = 0.015; // $0.015 per GB per month
    const requestCostPer1000 = 0.0036; // $0.0036 per 1000 Class A operations
    const bandwidthCostPerGB = 0.09; // $0.09 per GB egress

    const sizeInGB = stats.totalCompressedSize / (1024 * 1024 * 1024);
    const estimatedRequests = stats.totalFiles * 2; // Assume 2 requests per file per month
    const requestsIn1000s = Math.ceil(estimatedRequests / 1000);
    const bandwidthInGB = sizeInGB * 0.1; // Assume 10% of data is downloaded monthly

    const storage = sizeInGB * storageCostPerGB;
    const requests = requestsIn1000s * requestCostPer1000;
    const bandwidth = bandwidthInGB * bandwidthCostPerGB;

    return {
      storage,
      requests,
      bandwidth,
      total: storage + requests + bandwidth
    };
  }

  /**
   * Identify potential optimizations and calculate savings
   */
  private async identifyOptimizations(): Promise<{
    compressionSavings: number;
    deduplicationSavings: number;
    archivalSavings: number;
    cleanupSavings: number;
    totalSavings: number;
  }> {
    const compressionCandidates = await this.identifyCompressionCandidates();
    const duplicates = await this.identifyDuplicates();
    const archivalCandidates = await this.identifyArchivalCandidates();
    const cleanupCandidates = await this.identifyCleanupCandidates();

    // Calculate compression savings (assume 70% compression ratio)
    const compressionSavings = compressionCandidates.reduce((total, file) => {
      return total + (file.size * 0.3 * 0.015 / (1024 * 1024 * 1024)); // 30% size reduction
    }, 0);

    // Calculate deduplication savings
    const deduplicationSavings = duplicates.reduce((total, group) => {
      const totalSize = group.files.reduce((sum, file) => sum + file.size, 0);
      const savings = totalSize - group.files[0].size; // Keep one copy
      return total + (savings * 0.015 / (1024 * 1024 * 1024));
    }, 0);

    // Calculate archival savings (assume 50% cost reduction for archived data)
    const archivalSavings = archivalCandidates.reduce((total, file) => {
      return total + (file.size * 0.5 * 0.015 / (1024 * 1024 * 1024));
    }, 0);

    // Calculate cleanup savings (100% for deleted files)
    const cleanupSavings = cleanupCandidates.reduce((total, file) => {
      return total + (file.size * 0.015 / (1024 * 1024 * 1024));
    }, 0);

    const totalSavings = compressionSavings + deduplicationSavings + archivalSavings + cleanupSavings;

    return {
      compressionSavings,
      deduplicationSavings,
      archivalSavings,
      cleanupSavings,
      totalSavings
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(optimizations: any): string[] {
    const recommendations: string[] = [];

    if (optimizations.compressionSavings > 1) {
      recommendations.push(`Enable automatic compression to save $${optimizations.compressionSavings.toFixed(2)}/month`);
    }

    if (optimizations.deduplicationSavings > 0.5) {
      recommendations.push(`Remove duplicate files to save $${optimizations.deduplicationSavings.toFixed(2)}/month`);
    }

    if (optimizations.archivalSavings > 2) {
      recommendations.push(`Archive old files to save $${optimizations.archivalSavings.toFixed(2)}/month`);
    }

    if (optimizations.cleanupSavings > 0.1) {
      recommendations.push(`Clean up temporary and cache files to save $${optimizations.cleanupSavings.toFixed(2)}/month`);
    }

    if (optimizations.totalSavings > 5) {
      recommendations.push(`Implementing all optimizations could save $${optimizations.totalSavings.toFixed(2)}/month`);
    }

    recommendations.push('Set up automated retention policies to prevent future cost growth');
    recommendations.push('Monitor storage quotas and set up alerts for category limits');
    recommendations.push('Consider using CDN caching for frequently accessed files');

    return recommendations;
  }

  /**
   * Generate specific optimization actions
   */
  private async generateOptimizationActions(): Promise<OptimizationAction[]> {
    const actions: OptimizationAction[] = [];

    // Compression actions
    const compressionCandidates = await this.identifyCompressionCandidates();
    if (compressionCandidates.length > 0) {
      const compressionSavings = compressionCandidates.reduce((total, file) => {
        return total + (file.size * 0.3 * 0.015 / (1024 * 1024 * 1024));
      }, 0);

      actions.push({
        type: 'compress',
        fileIds: compressionCandidates.map(f => f.id),
        estimatedSavings: compressionSavings,
        description: `Compress ${compressionCandidates.length} large text/JSON files`,
        priority: compressionSavings > 2 ? 'high' : 'medium'
      });
    }

    // Deduplication actions
    const duplicates = await this.identifyDuplicates();
    for (const group of duplicates.slice(0, 10)) { // Limit to top 10 duplicate groups
      const filesToDelete = group.files.slice(1); // Keep the first file
      const savings = filesToDelete.reduce((total, file) => {
        return total + (file.size * 0.015 / (1024 * 1024 * 1024));
      }, 0);

      actions.push({
        type: 'deduplicate',
        fileIds: filesToDelete.map(f => f.id),
        estimatedSavings: savings,
        description: `Remove ${filesToDelete.length} duplicate files (checksum: ${group.checksum.substring(0, 8)}...)`,
        priority: savings > 1 ? 'high' : 'medium'
      });
    }

    // Archival actions
    const archivalCandidates = await this.identifyArchivalCandidates();
    if (archivalCandidates.length > 0) {
      const archivalSavings = archivalCandidates.reduce((total, file) => {
        return total + (file.size * 0.5 * 0.015 / (1024 * 1024 * 1024));
      }, 0);

      actions.push({
        type: 'archive',
        fileIds: archivalCandidates.map(f => f.id),
        estimatedSavings: archivalSavings,
        description: `Archive ${archivalCandidates.length} old files (>30 days)`,
        priority: archivalSavings > 3 ? 'high' : 'medium'
      });
    }

    // Cleanup actions
    const cleanupCandidates = await this.identifyCleanupCandidates();
    if (cleanupCandidates.length > 0) {
      const cleanupSavings = cleanupCandidates.reduce((total, file) => {
        return total + (file.size * 0.015 / (1024 * 1024 * 1024));
      }, 0);

      actions.push({
        type: 'delete',
        fileIds: cleanupCandidates.map(f => f.id),
        estimatedSavings: cleanupSavings,
        description: `Delete ${cleanupCandidates.length} temporary/cache files`,
        priority: 'high'
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.estimatedSavings - a.estimatedSavings;
    });
  }

  /**
   * Execute a specific optimization action
   */
  private async executeAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'compress':
        await this.executeCompressionAction(action.fileIds);
        break;
      case 'deduplicate':
        await this.executeDeduplicationAction(action.fileIds);
        break;
      case 'archive':
        await this.executeArchivalAction(action.fileIds);
        break;
      case 'delete':
        await this.executeCleanupAction(action.fileIds);
        break;
      default:
        throw new Error(`Unsupported optimization action: ${action.type}`);
    }
  }

  private async executeCompressionAction(fileIds: string[]): Promise<void> {
    // Implementation would compress the files and update metadata
    console.log(`Compressing ${fileIds.length} files`);
  }

  private async executeDeduplicationAction(fileIds: string[]): Promise<void> {
    // Implementation would delete duplicate files
    console.log(`Deduplicating ${fileIds.length} files`);
  }

  private async executeArchivalAction(fileIds: string[]): Promise<void> {
    // Implementation would move files to archive storage class
    console.log(`Archiving ${fileIds.length} files`);
  }

  private async executeCleanupAction(fileIds: string[]): Promise<void> {
    // Implementation would delete temporary/cache files
    console.log(`Cleaning up ${fileIds.length} files`);
  }

  /**
   * Helper methods
   */

  private async getCurrentStorageStats(): Promise<StorageStats> {
    // Simplified stats - in real implementation, this would query the full stats
    return {
      totalFiles: 0,
      totalSize: 0,
      totalCompressedSize: 0,
      categoryBreakdown: {},
      compressionSavings: 0,
      costsEstimate: { storage: 0, requests: 0, bandwidth: 0, total: 0 }
    };
  }

  private async identifyQuotaExceedingFiles(): Promise<FileMetadata[]> {
    const quotaQuery = `
      SELECT f.* FROM file_metadata f
      JOIN storage_quotas q ON f.category = q.category
      WHERE q.current_size > q.max_size
      ORDER BY f.uploaded_at ASC
    `;

    const results = await this.metadataDB.prepare(quotaQuery).all();
    return results.results.map(row => this.rowToMetadata(row));
  }

  private rowToMetadata(row: any): FileMetadata {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      size: row.size,
      mimeType: row.mime_type,
      uploadedAt: new Date(row.uploaded_at),
      lastModified: new Date(row.last_modified),
      tags: JSON.parse(row.tags || '{}'),
      category: row.category as FileCategory,
      source: row.source,
      compression: row.compression_info ? JSON.parse(row.compression_info) : undefined,
      checksums: JSON.parse(row.checksums),
      accessLevel: row.access_level,
      retentionPolicy: row.retention_policy ? JSON.parse(row.retention_policy) : undefined
    };
  }
}