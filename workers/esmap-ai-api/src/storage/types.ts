/**
 * R2 Storage Types and Interfaces
 */

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  lastModified: Date;
  tags: Record<string, string>;
  category: FileCategory;
  source: string;
  compression?: CompressionInfo;
  checksums: {
    md5: string;
    sha256: string;
  };
  accessLevel: AccessLevel;
  retentionPolicy?: RetentionPolicy;
}

export interface CompressionInfo {
  algorithm: 'gzip' | 'brotli' | 'lz4';
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface RetentionPolicy {
  type: 'temporary' | 'standard' | 'archive' | 'permanent';
  expiresAt?: Date;
  archiveAfter?: Date;
  deleteAfter?: Date;
}

export enum FileCategory {
  ENERGY_DATA = 'energy-data',
  CLIMATE_DATA = 'climate-data',
  GEOSPATIAL = 'geospatial',
  SURVEY_DATA = 'survey-data',
  PROCESSED_REPORTS = 'processed-reports',
  CACHE = 'cache',
  BACKUP = 'backup',
  TEMPORARY = 'temporary'
}

export enum AccessLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted',
  PRIVATE = 'private'
}

export interface StorageConfig {
  bucketName: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  compressionThreshold: number;
  archivalThreshold: number;
  costOptimization: CostOptimizationConfig;
}

export interface CostOptimizationConfig {
  enableCompression: boolean;
  enableDeduplication: boolean;
  enableArchival: boolean;
  maxStoragePerCategory: Record<FileCategory, number>;
  cleanup: {
    tempFileRetention: number; // days
    cacheRetention: number; // days
    backupRetention: number; // days
  };
}

export interface UploadOptions {
  compress?: boolean;
  category: FileCategory;
  accessLevel: AccessLevel;
  tags?: Record<string, string>;
  retentionPolicy?: RetentionPolicy;
  metadata?: Record<string, string>;
}

export interface DownloadOptions {
  decompress?: boolean;
  range?: {
    start: number;
    end: number;
  };
}

export interface SearchOptions {
  category?: FileCategory;
  source?: string;
  tags?: Record<string, string>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  limit?: number;
  offset?: number;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  totalCompressedSize: number;
  categoryBreakdown: Record<FileCategory, {
    count: number;
    size: number;
    compressedSize: number;
  }>;
  compressionSavings: number;
  costsEstimate: {
    storage: number;
    requests: number;
    bandwidth: number;
    total: number;
  };
}

export interface FileOperation {
  type: 'upload' | 'download' | 'delete' | 'archive';
  fileId: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  metadata?: Record<string, any>;
}

export interface BulkOperation {
  id: string;
  type: 'bulk-upload' | 'bulk-download' | 'bulk-archive' | 'bulk-delete';
  files: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
    failed: number;
  };
  startedAt: Date;
  completedAt?: Date;
  errors: string[];
}