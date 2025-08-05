import type { Env } from './types';
import { Logger } from './utils/logger';
import { handleError, ApiError, createSuccessResponse } from './utils/error-handler';
import { handleHealthCheck } from './routes/health';
import { handleDataSourcesRoute } from './routes/data-sources';
import { handleDatabaseRoute } from './routes/database';
import { handleESMAPRoute } from './routes/esmap';
import { handleStorageRoute } from './routes/storage';
import { ETLWorker } from './etl/etl-worker';
import { VectorizeRoutes } from './routes/vectorize';

async function handleVectorizeRoute(request: Request, env: any, logger: Logger, path: string): Promise<Response> {
  const vectorizeRoutes = new VectorizeRoutes(env);
  const pathParts = path.split('/').filter(p => p);
  const endpoint = pathParts.slice(3).join('/'); // Remove 'api', 'v1', 'vectorize'
  
  try {
    switch (endpoint) {
      case 'embeddings':
        if (request.method === 'POST') {
          return await vectorizeRoutes.generateEmbeddings(request);
        }
        break;
      case 'upsert':
        if (request.method === 'POST') {
          return await vectorizeRoutes.upsertVectors(request);
        }
        break;
      case 'search':
        if (request.method === 'POST') {
          return await vectorizeRoutes.vectorSearch(request);
        }
        break;
      case 'hybrid-search':
        if (request.method === 'POST') {
          return await vectorizeRoutes.hybridSearch(request);
        }
        break;
      case 'vectors':
        if (request.method === 'DELETE') {
          return await vectorizeRoutes.deleteVectors(request);
        }
        break;
      case 'stats':
        if (request.method === 'GET') {
          return await vectorizeRoutes.getIndexStats(request);
        }
        break;
      case 'metrics':
        if (request.method === 'GET') {
          return await vectorizeRoutes.getPerformanceMetrics(request);
        }
        break;
      case 'maintenance':
        if (request.method === 'POST') {
          return await vectorizeRoutes.performMaintenance(request);
        }
        break;
      case 'health':
        if (request.method === 'GET') {
          return await vectorizeRoutes.healthCheck(request);
        }
        break;
      default:
        if (endpoint.startsWith('similar/')) {
          if (request.method === 'GET') {
            return await vectorizeRoutes.getSimilarDocuments(request);
          }
        }
        break;
    }
    
    throw new ApiError(`Method ${request.method} not allowed for ${path}`, 405, 'METHOD_NOT_ALLOWED');
  } catch (error) {
    logger.error('Vectorize route error', { path, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = crypto.randomUUID();
    const logger = new Logger(requestId, env.ENVIRONMENT);
    
    logger.info('Request received', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent')
    });
    
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // CORS headers for preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }
      
      // Route handling
      if (path === '/health') {
        return await handleHealthCheck(env, logger);
      } else if (path === '/') {
        const welcomeData = {
          message: 'ESMAP AI API',
          version: '1.0.0',
          environment: env.ENVIRONMENT || 'development',
          endpoints: [
            '/health - Health check endpoint',
            '/api/v1/data-sources - External data source integrations',
            '/api/v1/database - Database operations and energy data',
            '/api/v1/esmap - ESMAP-specific data integration endpoints',
            '/api/v1/etl - ETL pipeline management',
            '/api/v1/storage - R2 file storage and management',
            '/api/v1/vectorize - Vector embeddings and semantic search',
            '/api/v1/ai - AI models and inference endpoints'
          ]
        };
        
        logger.info('Welcome endpoint accessed');
        const response = createSuccessResponse(welcomeData, requestId);
        return Response.json(response);
      } else if (path.startsWith('/api/v1/data-sources')) {
        return await handleDataSourcesRoute(request, env, logger, path);
      } else if (path.startsWith('/api/v1/database')) {
        return await handleDatabaseRoute(request, env, logger, path);
      } else if (path.startsWith('/api/v1/esmap')) {
        return await handleESMAPRoute(request, env, logger, path);
      } else if (path.startsWith('/api/v1/etl') || path.startsWith('/etl')) {
        const etlWorker = new ETLWorker(env as any);
        return await etlWorker.handleRequest(request);
      } else if (path.startsWith('/api/v1/storage')) {
        return await handleStorageRoute(request, env as any, logger, path);
      } else if (path.startsWith('/api/v1/vectorize')) {
        return await handleVectorizeRoute(request, env as any, logger, path);
      } else if (path.startsWith('/api/v1/ai')) {
        const { handleAIModelsRoute } = await import('./routes/ai-models');
        const segments = path.split('/').filter(s => s);
        return await handleAIModelsRoute(request, env as any, { requestId, logger }, segments);
      } else {
        throw new ApiError('Endpoint not found', 404, 'NOT_FOUND');
      }
      
    } catch (error) {
      return handleError(error, logger);
    }
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const etlWorker = new ETLWorker(env as any);
    
    for (const message of batch.messages) {
      await etlWorker.processQueueMessage(message.body);
      message.ack();
    }
  }
};