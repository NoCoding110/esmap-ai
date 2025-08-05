/**
 * Vectorize API Routes for ESMAP AI Platform
 * Handles embedding generation, vector search, and semantic operations
 */

// No need to import Response - it's a global in Workers runtime
import { VectorizeManager } from '../vectorize/vectorize-manager';
import {
  EmbeddingGenerationRequest,
  VectorSearchQuery,
  BulkUpsertRequest,
  HybridSearchQuery,
  EmbeddingType,
  EnergyDataCategory,
  EmbeddingModel
} from '../vectorize/types';

interface Env {
  VECTORIZE_INDEX: Vectorize;
  DB: D1Database;
  CACHE: KVNamespace;
}

export class VectorizeRoutes {
  private vectorizeManager: VectorizeManager;

  constructor(env: Env) {
    this.vectorizeManager = new VectorizeManager(
      env.VECTORIZE_INDEX,
      env.DB,
      env.CACHE,
      {
        default_top_k: 10,
        max_top_k: 100,
        similarity_threshold: 0.7,
        cache_results: true,
        cache_ttl_seconds: 3600
      }
    );
  }

  /**
   * Generate embeddings for text content
   * POST /api/v1/vectorize/embeddings
   */
  async generateEmbeddings(request: Request): Promise<Response> {
    try {
      const body = await request.json() as EmbeddingGenerationRequest;

      // Validate request
      if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'texts array is required and must not be empty'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.texts.length > 100) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Maximum 100 texts allowed per request'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.generateEmbeddings(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Embedding generation error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to generate embeddings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Bulk upsert vectors to the index
   * POST /api/v1/vectorize/upsert
   */
  async upsertVectors(request: Request): Promise<Response> {
    try {
      const body = await request.json() as BulkUpsertRequest;

      // Validate request
      if (!body.vectors || !Array.isArray(body.vectors) || body.vectors.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'vectors array is required and must not be empty'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.vectors.length > 1000) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Maximum 1000 vectors allowed per request'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate vector dimensions
      for (const vector of body.vectors) {
        if (!vector.values || vector.values.length !== 1536) {
          return new Response(JSON.stringify({
            success: false,
            error: 'All vectors must have exactly 1536 dimensions'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const result = await this.vectorizeManager.upsertVectors(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Vector upsert error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to upsert vectors',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Vector similarity search
   * POST /api/v1/vectorize/search
   */
  async vectorSearch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as VectorSearchQuery;

      // Validate request
      if (!body.text && !body.vector) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Either text or vector must be provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.vector && body.vector.length !== 1536) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Vector must have exactly 1536 dimensions'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.topK && (body.topK < 1 || body.topK > 100)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'topK must be between 1 and 100'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.vectorSearch(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Vector search error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to perform vector search',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   * POST /api/v1/vectorize/hybrid-search
   */
  async hybridSearch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as HybridSearchQuery;

      // Validate request
      if (!body.text && !body.vector) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Either text or vector must be provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.hybridSearch(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Hybrid search error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to perform hybrid search',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get similar documents by document ID
   * GET /api/v1/vectorize/similar/:documentId
   */
  async getSimilarDocuments(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 1];

      if (!documentId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Document ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const topK = parseInt(url.searchParams.get('topK') || '10');
      
      if (topK < 1 || topK > 100) {
        return new Response(JSON.stringify({
          success: false,
          error: 'topK must be between 1 and 100'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.getSimilarDocuments(documentId, topK);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Similar documents error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get similar documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Delete vectors from the index
   * DELETE /api/v1/vectorize/vectors
   */
  async deleteVectors(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { vectorIds: string[]; namespace?: string };

      if (!body.vectorIds || !Array.isArray(body.vectorIds) || body.vectorIds.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'vectorIds array is required and must not be empty'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.vectorIds.length > 100) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Maximum 100 vector IDs allowed per request'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.deleteVectors(body.vectorIds, body.namespace);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Vector deletion error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete vectors',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get index statistics and health metrics
   * GET /api/v1/vectorize/stats
   */
  async getIndexStats(request: Request): Promise<Response> {
    try {
      const result = await this.vectorizeManager.getIndexStats();

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Index stats error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get index statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get performance metrics
   * GET /api/v1/vectorize/metrics
   */
  async getPerformanceMetrics(request: Request): Promise<Response> {
    try {
      const result = await this.vectorizeManager.getPerformanceMetrics();

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Performance metrics error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Perform index maintenance operations
   * POST /api/v1/vectorize/maintenance
   */
  async performMaintenance(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { operation: 'optimize' | 'cleanup' | 'rebuild' };

      if (!body.operation || !['optimize', 'cleanup', 'rebuild'].includes(body.operation)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'operation must be one of: optimize, cleanup, rebuild'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.vectorizeManager.performMaintenance(body.operation);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Maintenance error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to perform maintenance',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Health check for vectorize service
   * GET /api/v1/vectorize/health
   */
  async healthCheck(request: Request): Promise<Response> {
    try {
      const stats = await this.vectorizeManager.getIndexStats();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          status: 'healthy',
          index_name: stats.name,
          total_vectors: stats.total_vectors,
          dimensions: stats.dimensions,
          last_updated: stats.last_updated,
          timestamp: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Health check error:', error);
      return new Response(JSON.stringify({
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}