/**
 * Cloudflare R2 Storage Manager
 * Handles file operations, compression, metadata indexing, and cost optimization
 */

import {
  FileMetadata,
  CompressionInfo,
  StorageConfig,
  UploadOptions,
  DownloadOptions,
  SearchOptions,
  StorageStats,
  FileOperation,
  BulkOperation,
  FileCategory,
  AccessLevel,
  RetentionPolicy
} from './types';

export class R2StorageManager {
  private bucket: R2Bucket;
  private metadataDB: D1Database;
  private cache: KVNamespace;
  private config: StorageConfig;

  constructor(
    bucket: R2Bucket,
    metadataDB: D1Database,
    cache: KVNamespace,
    config: StorageConfig
  ) {
    this.bucket = bucket;
    this.metadataDB = metadataDB;
    this.cache = cache;
    this.config = config;
  }

  /**
   * Upload a file to R2 with compression and metadata
   */
  async uploadFile(
    file: ArrayBuffer | ReadableStream,
    filename: string,
    options: UploadOptions
  ): Promise<FileMetadata> {
    const fileId = this.generateFileId(filename);
    const originalSize = file instanceof ArrayBuffer ? file.byteLength : 0;

    try {
      // Validate file
      await this.validateFile(file, filename, options);

      // Generate checksums
      const checksums = await this.generateChecksums(file);

      // Compress if needed
      let finalData = file;
      let compressionInfo: CompressionInfo | undefined;

      if (options.compress && originalSize > this.config.compressionThreshold) {
        const compressed = await this.compressFile(file);
        finalData = compressed.data;
        compressionInfo = compressed.info;
      }

      // Upload to R2
      const r2Key = this.generateR2Key(fileId, options.category);
      
      await this.bucket.put(r2Key, finalData, {
        httpMetadata: {
          contentType: this.getMimeType(filename),
          contentEncoding: compressionInfo ? compressionInfo.algorithm : undefined,
          cacheControl: this.getCacheControl(options.accessLevel),
        },
        customMetadata: {
          ...options.metadata,
          fileId,
          category: options.category,
          originalSize: originalSize.toString(),
          compressed: compressionInfo ? 'true' : 'false'
        }
      });

      // Create metadata record
      const metadata: FileMetadata = {
        id: fileId,
        filename: r2Key,
        originalName: filename,
        size: originalSize,
        mimeType: this.getMimeType(filename),
        uploadedAt: new Date(),
        lastModified: new Date(),
        tags: options.tags || {},
        category: options.category,
        source: options.metadata?.source || 'unknown',
        compression: compressionInfo,
        checksums,
        accessLevel: options.accessLevel,
        retentionPolicy: options.retentionPolicy
      };

      // Store metadata in D1
      await this.storeMetadata(metadata);

      // Cache frequently accessed metadata
      if (this.shouldCacheMetadata(options.category)) {
        await this.cache.put(`metadata:${fileId}`, JSON.stringify(metadata), {
          expirationTtl: 3600 // 1 hour
        });
      }

      // Log operation
      await this.logOperation({
        type: 'upload',
        fileId,
        timestamp: new Date(),
        status: 'success',
        metadata: { size: originalSize, compressed: !!compressionInfo }
      });

      return metadata;

    } catch (error) {
      await this.logOperation({
        type: 'upload',
        fileId,
        timestamp: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Download a file from R2 with decompression
   */
  async downloadFile(fileId: string, options: DownloadOptions = {}): Promise<{
    data: ReadableStream;
    metadata: FileMetadata;
  }> {
    try {
      // Get metadata
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Check access permissions
      await this.checkAccessPermissions(metadata, 'read');

      // Get file from R2
      const r2Object = await this.bucket.get(metadata.filename, {
        range: options.range ? {
          offset: options.range.start,
          length: options.range.end - options.range.start + 1
        } : undefined
      });

      if (!r2Object) {
        throw new Error(`File data not found in R2: ${fileId}`);
      }

      let data = r2Object.body;

      // Decompress if needed
      if (options.decompress && metadata.compression) {
        data = await this.decompressStream(data, metadata.compression.algorithm);
      }

      // Log operation
      await this.logOperation({
        type: 'download',
        fileId,
        timestamp: new Date(),
        status: 'success',
        metadata: { size: metadata.size }
      });

      return { data, metadata };

    } catch (error) {
      await this.logOperation({
        type: 'download',
        fileId,
        timestamp: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete a file from R2 and remove metadata
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Check access permissions
      await this.checkAccessPermissions(metadata, 'delete');

      // Delete from R2
      await this.bucket.delete(metadata.filename);

      // Remove metadata from D1
      await this.metadataDB.prepare(
        'DELETE FROM file_metadata WHERE id = ?'
      ).bind(fileId).run();

      // Remove from cache
      await this.cache.delete(`metadata:${fileId}`);

      // Log operation
      await this.logOperation({
        type: 'delete',
        fileId,
        timestamp: new Date(),
        status: 'success'
      });

    } catch (error) {
      await this.logOperation({
        type: 'delete',
        fileId,
        timestamp: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Search files based on metadata
   */
  async searchFiles(options: SearchOptions): Promise<FileMetadata[]> {
    let query = 'SELECT * FROM file_metadata WHERE 1=1';
    const params: any[] = [];

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    if (options.source) {
      query += ' AND source = ?';
      params.push(options.source);
    }

    if (options.dateRange) {
      query += ' AND uploaded_at BETWEEN ? AND ?';
      params.push(options.dateRange.start.toISOString());
      params.push(options.dateRange.end.toISOString());
    }

    if (options.sizeRange) {
      query += ' AND size BETWEEN ? AND ?';
      params.push(options.sizeRange.min);
      params.push(options.sizeRange.max);
    }

    query += ' ORDER BY uploaded_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const results = await this.metadataDB.prepare(query).bind(...params).all();
    
    return results.results.map(row => this.rowToMetadata(row));
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const statsQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(size) as total_size,
        SUM(CASE WHEN compression_info IS NOT NULL 
            THEN json_extract(compression_info, '$.compressedSize') 
            ELSE size END) as compressed_size
      FROM file_metadata 
      GROUP BY category
    `;

    const results = await this.metadataDB.prepare(statsQuery).all();
    
    const categoryBreakdown: Record<string, any> = {};
    let totalFiles = 0;
    let totalSize = 0;
    let totalCompressedSize = 0;

    for (const row of results.results) {
      const category = row.category as FileCategory;
      const count = row.count as number;
      const size = row.total_size as number;
      const compressedSize = row.compressed_size as number;

      categoryBreakdown[category] = {
        count,
        size,
        compressedSize
      };

      totalFiles += count;
      totalSize += size;
      totalCompressedSize += compressedSize;
    }

    const compressionSavings = totalSize - totalCompressedSize;
    const costsEstimate = this.calculateCosts(totalCompressedSize, totalFiles);

    return {
      totalFiles,
      totalSize,
      totalCompressedSize,
      categoryBreakdown,
      compressionSavings,
      costsEstimate
    };
  }

  /**
   * Archive old files based on retention policy
   */
  async archiveFiles(): Promise<{ archived: number; deleted: number }> {
    const now = new Date();
    const archiveQuery = `
      SELECT id FROM file_metadata 
      WHERE retention_policy IS NOT NULL 
      AND json_extract(retention_policy, '$.archiveAfter') IS NOT NULL
      AND datetime(json_extract(retention_policy, '$.archiveAfter')) <= datetime('now')
      AND category != 'archive'
    `;

    const deleteQuery = `
      SELECT id FROM file_metadata 
      WHERE retention_policy IS NOT NULL 
      AND json_extract(retention_policy, '$.deleteAfter') IS NOT NULL
      AND datetime(json_extract(retention_policy, '$.deleteAfter')) <= datetime('now')
    `;

    const archiveResults = await this.metadataDB.prepare(archiveQuery).all();
    const deleteResults = await this.metadataDB.prepare(deleteQuery).all();

    let archived = 0;
    let deleted = 0;

    // Archive files
    for (const row of archiveResults.results) {
      try {
        await this.archiveFile(row.id as string);
        archived++;
      } catch (error) {
        console.error(`Failed to archive file ${row.id}:`, error);
      }
    }

    // Delete files
    for (const row of deleteResults.results) {
      try {
        await this.deleteFile(row.id as string);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete file ${row.id}:`, error);
      }
    }

    return { archived, deleted };
  }

  /**
   * Private helper methods
   */

  private generateFileId(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}_${random}_${cleanName}`;
  }

  private generateR2Key(fileId: string, category: FileCategory): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `${category}/${year}/${month}/${fileId}`;
  }

  private async validateFile(
    file: ArrayBuffer | ReadableStream,
    filename: string,
    options: UploadOptions
  ): Promise<void> {
    const mimeType = this.getMimeType(filename);
    
    if (!this.config.allowedMimeTypes.includes(mimeType) && 
        !this.config.allowedMimeTypes.includes('*/*')) {
      throw new Error(`File type not allowed: ${mimeType}`);
    }

    if (file instanceof ArrayBuffer && file.byteLength > this.config.maxFileSize) {
      throw new Error(`File too large: ${file.byteLength} bytes (max: ${this.config.maxFileSize})`);
    }
  }

  private async generateChecksums(file: ArrayBuffer | ReadableStream): Promise<{
    md5: string;
    sha256: string;
  }> {
    // For ArrayBuffer, calculate checksums directly
    if (file instanceof ArrayBuffer) {
      const [md5Hash, sha256Hash] = await Promise.all([
        crypto.subtle.digest('MD5', file),
        crypto.subtle.digest('SHA-256', file)
      ]);

      return {
        md5: Array.from(new Uint8Array(md5Hash))
          .map(b => b.toString(16).padStart(2, '0')).join(''),
        sha256: Array.from(new Uint8Array(sha256Hash))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      };
    }

    // For ReadableStream, we need to read the data first
    // This is a simplified implementation - in practice, you'd want to hash while streaming
    return {
      md5: 'stream-md5-placeholder',
      sha256: 'stream-sha256-placeholder'
    };
  }

  private async compressFile(file: ArrayBuffer | ReadableStream): Promise<{
    data: ReadableStream;
    info: CompressionInfo;
  }> {
    // Implement compression using CompressionStream
    const originalSize = file instanceof ArrayBuffer ? file.byteLength : 0;
    
    // Create compression stream
    const compressionStream = new CompressionStream('gzip');
    
    let inputStream: ReadableStream;
    if (file instanceof ArrayBuffer) {
      inputStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(file));
          controller.close();
        }
      });
    } else {
      inputStream = file;
    }

    const compressedStream = inputStream.pipeThrough(compressionStream);

    // Calculate compressed size (simplified - in practice, you'd track this)
    const compressedSize = Math.floor(originalSize * 0.7); // Estimated 30% compression

    return {
      data: compressedStream,
      info: {
        algorithm: 'gzip',
        originalSize,
        compressedSize,
        compressionRatio: compressedSize / originalSize
      }
    };
  }

  private async decompressStream(
    stream: ReadableStream,
    algorithm: 'gzip' | 'brotli' | 'lz4'
  ): Promise<ReadableStream> {
    if (algorithm === 'gzip') {
      const decompressionStream = new DecompressionStream('gzip');
      return stream.pipeThrough(decompressionStream);
    }
    
    // Add support for other algorithms as needed
    throw new Error(`Decompression algorithm not supported: ${algorithm}`);
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'json': 'application/json',
      'csv': 'text/csv',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'xml': 'application/xml'
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private getCacheControl(accessLevel: AccessLevel): string {
    switch (accessLevel) {
      case AccessLevel.PUBLIC:
        return 'public, max-age=3600';
      case AccessLevel.INTERNAL:
        return 'private, max-age=1800';
      case AccessLevel.RESTRICTED:
        return 'private, no-cache';
      case AccessLevel.PRIVATE:
        return 'private, no-store';
      default:
        return 'private, max-age=300';
    }
  }

  private shouldCacheMetadata(category: FileCategory): boolean {
    return [
      FileCategory.ENERGY_DATA,
      FileCategory.PROCESSED_REPORTS
    ].includes(category);
  }

  private async storeMetadata(metadata: FileMetadata): Promise<void> {
    const query = `
      INSERT INTO file_metadata (
        id, filename, original_name, size, mime_type, uploaded_at, 
        last_modified, tags, category, source, compression_info, 
        checksums, access_level, retention_policy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.metadataDB.prepare(query).bind(
      metadata.id,
      metadata.filename,
      metadata.originalName,
      metadata.size,
      metadata.mimeType,
      metadata.uploadedAt.toISOString(),
      metadata.lastModified.toISOString(),
      JSON.stringify(metadata.tags),
      metadata.category,
      metadata.source,
      metadata.compression ? JSON.stringify(metadata.compression) : null,
      JSON.stringify(metadata.checksums),
      metadata.accessLevel,
      metadata.retentionPolicy ? JSON.stringify(metadata.retentionPolicy) : null
    ).run();
  }

  private async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    // Try cache first
    const cached = await this.cache.get(`metadata:${fileId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const result = await this.metadataDB.prepare(
      'SELECT * FROM file_metadata WHERE id = ?'
    ).bind(fileId).first();

    return result ? this.rowToMetadata(result) : null;
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
      accessLevel: row.access_level as AccessLevel,
      retentionPolicy: row.retention_policy ? JSON.parse(row.retention_policy) : undefined
    };
  }

  private async checkAccessPermissions(metadata: FileMetadata, operation: string): Promise<void> {
    // Implement access control logic based on metadata.accessLevel
    // This is a simplified version - in practice, you'd check user permissions
    if (metadata.accessLevel === AccessLevel.PRIVATE && operation !== 'read') {
      throw new Error('Access denied: Private file');
    }
  }

  private async logOperation(operation: FileOperation): Promise<void> {
    // Store operation log in D1 for audit trail
    await this.metadataDB.prepare(
      'INSERT INTO file_operations (type, file_id, timestamp, status, error, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      operation.type,
      operation.fileId,
      operation.timestamp.toISOString(),
      operation.status,
      operation.error || null,
      operation.metadata ? JSON.stringify(operation.metadata) : null
    ).run();
  }

  private async archiveFile(fileId: string): Promise<void> {
    // Move file to archive storage class or different bucket
    // Update metadata to reflect archived status
    await this.metadataDB.prepare(
      'UPDATE file_metadata SET category = ?, last_modified = ? WHERE id = ?'
    ).bind(FileCategory.BACKUP, new Date().toISOString(), fileId).run();
  }

  private calculateCosts(totalSize: number, totalFiles: number): {
    storage: number;
    requests: number;
    bandwidth: number;
    total: number;
  } {
    // Cloudflare R2 pricing (as of 2024)
    const storageCostPerGB = 0.015; // $0.015 per GB per month
    const requestCostPer1000 = 0.0036; // $0.0036 per 1000 requests
    const bandwidthCostPerGB = 0.09; // $0.09 per GB (egress)

    const sizeInGB = totalSize / (1024 * 1024 * 1024);
    const requestsIn1000s = Math.ceil(totalFiles / 1000);
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
}