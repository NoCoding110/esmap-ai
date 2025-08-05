/**
 * R2 Storage API Routes
 */

import { R2StorageManager } from '../storage/r2-storage-manager';
import { FileCategory, AccessLevel, UploadOptions, DownloadOptions, SearchOptions } from '../storage/types';
import type { Env } from '../types';
import type { Logger } from '../utils/logger';
import { ApiError, createSuccessResponse } from '../utils/error-handler';

export interface StorageEnv extends Env {
  DATA_BUCKET: R2Bucket;
}

export async function handleStorageRoute(
  request: Request,
  env: StorageEnv,
  logger: Logger,
  path: string
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // Initialize storage manager
  const storageManager = new R2StorageManager(
    env.DATA_BUCKET,
    env.DB,
    env.CACHE,
    {
      bucketName: 'esmap-ai-data',
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      allowedMimeTypes: [
        'application/json',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        'application/zip',
        'text/plain',
        'application/xml',
        '*/*'
      ],
      compressionThreshold: 1024 * 1024, // 1MB
      archivalThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
      costOptimization: {
        enableCompression: true,
        enableDeduplication: true,
        enableArchival: true,
        maxStoragePerCategory: {
          'energy-data': 100 * 1024 * 1024 * 1024, // 100GB
          'climate-data': 50 * 1024 * 1024 * 1024,  // 50GB
          'geospatial': 30 * 1024 * 1024 * 1024,    // 30GB
          'survey-data': 20 * 1024 * 1024 * 1024,   // 20GB
          'processed-reports': 10 * 1024 * 1024 * 1024, // 10GB
          'cache': 5 * 1024 * 1024 * 1024,          // 5GB
          'backup': 50 * 1024 * 1024 * 1024,        // 50GB
          'temporary': 1 * 1024 * 1024 * 1024       // 1GB
        },
        cleanup: {
          tempFileRetention: 7,    // 7 days
          cacheRetention: 30,      // 30 days
          backupRetention: 365     // 1 year
        }
      }
    }
  );

  try {
    // Route handling
    if (path === '/api/v1/storage/upload' && method === 'POST') {
      return await handleFileUpload(request, storageManager, logger);
    
    } else if (path.startsWith('/api/v1/storage/download/') && method === 'GET') {
      const fileId = path.split('/').pop();
      if (!fileId) {
        throw new ApiError('File ID required', 400, 'MISSING_FILE_ID');
      }
      return await handleFileDownload(fileId, request, storageManager, logger);
    
    } else if (path.startsWith('/api/v1/storage/delete/') && method === 'DELETE') {
      const fileId = path.split('/').pop();
      if (!fileId) {
        throw new ApiError('File ID required', 400, 'MISSING_FILE_ID');
      }
      return await handleFileDelete(fileId, storageManager, logger);
    
    } else if (path === '/api/v1/storage/search' && method === 'GET') {
      return await handleFileSearch(request, storageManager, logger);
    
    } else if (path === '/api/v1/storage/stats' && method === 'GET') {
      return await handleStorageStats(storageManager, logger);
    
    } else if (path === '/api/v1/storage/archive' && method === 'POST') {
      return await handleArchival(storageManager, logger);
    
    } else if (path === '/api/v1/storage/bulk' && method === 'POST') {
      return await handleBulkOperation(request, storageManager, logger);
    
    } else {
      throw new ApiError('Storage endpoint not found', 404, 'NOT_FOUND');
    }

  } catch (error) {
    logger.error('Storage route error', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(
  request: Request,
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as FileCategory || FileCategory.ENERGY_DATA;
    const accessLevel = formData.get('accessLevel') as AccessLevel || AccessLevel.INTERNAL;
    const compress = formData.get('compress') === 'true';
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : {};
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {};

    if (!file) {
      throw new ApiError('No file provided', 400, 'MISSING_FILE');
    }

    logger.info('Starting file upload', {
      filename: file.name,
      size: file.size,
      category,
      accessLevel,
      compress
    });

    const options: UploadOptions = {
      compress,
      category,
      accessLevel,
      tags,
      metadata: {
        ...metadata,
        source: 'api-upload',
        uploadedBy: 'system' // In production, this would be the authenticated user
      }
    };

    const fileBuffer = await file.arrayBuffer();
    const fileMetadata = await storageManager.uploadFile(fileBuffer, file.name, options);

    logger.info('File uploaded successfully', {
      fileId: fileMetadata.id,
      filename: fileMetadata.filename,
      size: fileMetadata.size
    });

    const response = createSuccessResponse({
      message: 'File uploaded successfully',
      file: fileMetadata
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('File upload failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle file download
 */
async function handleFileDownload(
  fileId: string,
  request: Request,
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const decompress = url.searchParams.get('decompress') === 'true';
    const rangeHeader = request.headers.get('range');

    logger.info('Starting file download', { fileId, decompress });

    const options: DownloadOptions = {
      decompress
    };

    // Parse range header if present
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : undefined;
        if (end !== undefined) {
          options.range = { start, end };
        }
      }
    }

    const { data, metadata } = await storageManager.downloadFile(fileId, options);

    logger.info('File download successful', {
      fileId,
      filename: metadata.originalName,
      size: metadata.size
    });

    const headers = new Headers({
      'Content-Type': metadata.mimeType,
      'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
      'X-File-ID': metadata.id,
      'X-File-Size': metadata.size.toString(),
      'X-Upload-Date': metadata.uploadedAt.toISOString()
    });

    if (metadata.compression && !decompress) {
      headers.set('Content-Encoding', metadata.compression.algorithm);
    }

    return new Response(data, {
      status: rangeHeader ? 206 : 200,
      headers
    });

  } catch (error) {
    logger.error('File download failed', { fileId, error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle file deletion
 */
async function handleFileDelete(
  fileId: string,
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    logger.info('Starting file deletion', { fileId });

    await storageManager.deleteFile(fileId);

    logger.info('File deleted successfully', { fileId });

    const response = createSuccessResponse({
      message: 'File deleted successfully',
      fileId
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('File deletion failed', { fileId, error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle file search
 */
async function handleFileSearch(
  request: Request,
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const searchOptions: SearchOptions = {};

    if (url.searchParams.get('category')) {
      searchOptions.category = url.searchParams.get('category') as FileCategory;
    }

    if (url.searchParams.get('source')) {
      searchOptions.source = url.searchParams.get('source') as string;
    }

    if (url.searchParams.get('startDate') && url.searchParams.get('endDate')) {
      searchOptions.dateRange = {
        start: new Date(url.searchParams.get('startDate')!),
        end: new Date(url.searchParams.get('endDate')!)
      };
    }

    if (url.searchParams.get('minSize') && url.searchParams.get('maxSize')) {
      searchOptions.sizeRange = {
        min: parseInt(url.searchParams.get('minSize')!, 10),
        max: parseInt(url.searchParams.get('maxSize')!, 10)
      };
    }

    searchOptions.limit = url.searchParams.get('limit') ? 
      parseInt(url.searchParams.get('limit')!, 10) : 50;
    
    searchOptions.offset = url.searchParams.get('offset') ? 
      parseInt(url.searchParams.get('offset')!, 10) : 0;

    logger.info('Starting file search', { searchOptions });

    const files = await storageManager.searchFiles(searchOptions);

    logger.info('File search completed', { resultCount: files.length });

    const response = createSuccessResponse({
      files,
      count: files.length,
      searchOptions
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('File search failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle storage statistics
 */
async function handleStorageStats(
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    logger.info('Getting storage statistics');

    const stats = await storageManager.getStorageStats();

    logger.info('Storage statistics retrieved', {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      compressionSavings: stats.compressionSavings
    });

    const response = createSuccessResponse({
      stats,
      formattedStats: {
        totalFiles: stats.totalFiles.toLocaleString(),
        totalSize: formatBytes(stats.totalSize),
        totalCompressedSize: formatBytes(stats.totalCompressedSize),
        compressionSavings: formatBytes(stats.compressionSavings),
        monthlyCostEstimate: `$${stats.costsEstimate.total.toFixed(2)}`
      }
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('Storage stats failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle archival process
 */
async function handleArchival(
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    logger.info('Starting archival process');

    const result = await storageManager.archiveFiles();

    logger.info('Archival process completed', {
      archived: result.archived,
      deleted: result.deleted
    });

    const response = createSuccessResponse({
      message: 'Archival process completed',
      result
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('Archival process failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Handle bulk operations
 */
async function handleBulkOperation(
  request: Request,
  storageManager: R2StorageManager,
  logger: Logger
): Promise<Response> {
  try {
    const body = await request.json();
    const { operation, fileIds } = body;

    if (!operation || !fileIds || !Array.isArray(fileIds)) {
      throw new ApiError('Invalid bulk operation request', 400, 'INVALID_REQUEST');
    }

    logger.info('Starting bulk operation', {
      operation,
      fileCount: fileIds.length
    });

    // For now, return operation queued - in production this would use queues
    const bulkOpId = crypto.randomUUID();

    const response = createSuccessResponse({
      message: 'Bulk operation queued',
      operationId: bulkOpId,
      operation,
      fileCount: fileIds.length
    }, crypto.randomUUID());

    return Response.json(response);

  } catch (error) {
    logger.error('Bulk operation failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}