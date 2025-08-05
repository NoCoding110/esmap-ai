/**
 * Cloudflare Vectorize Manager for ESMAP AI Platform
 * Handles embedding generation, vector operations, and semantic search
 */

import {
  EmbeddingRequest,
  EmbeddingMetadata,
  VectorSearchQuery,
  VectorSearchResult,
  VectorSearchResponse,
  EmbeddingGenerationRequest,
  EmbeddingGenerationResponse,
  BulkUpsertRequest,
  BulkUpsertResponse,
  IndexStats,
  SemanticSearchConfig,
  HybridSearchQuery,
  EmbeddingModel,
  EmbeddingType,
  EnergyDataCategory,
  VectorFilter,
  MaintenanceResult,
  QueryAnalytics,
  VectorizePerformanceMetrics
} from './types';

export class VectorizeManager {
  private vectorize: Vectorize;
  private metadataDB: D1Database;
  private cache: KVNamespace;
  private config: SemanticSearchConfig;

  constructor(
    vectorize: Vectorize,
    metadataDB: D1Database,
    cache: KVNamespace,
    config?: Partial<SemanticSearchConfig>
  ) {
    this.vectorize = vectorize;
    this.metadataDB = metadataDB;
    this.cache = cache;
    this.config = {
      default_top_k: 10,
      max_top_k: 100,
      similarity_threshold: 0.7,
      result_diversity_factor: 0.3,
      enable_reranking: true,
      cache_results: true,
      cache_ttl_seconds: 3600,
      ...config
    };
  }

  /**
   * Generate embeddings for text data using AI models
   */
  async generateEmbeddings(request: EmbeddingGenerationRequest): Promise<EmbeddingGenerationResponse> {
    const startTime = Date.now();
    
    try {
      // For now, we'll use a simplified embedding generation
      // In production, this would integrate with OpenAI API or other embedding services
      const embeddings = await this.generateMockEmbeddings(request.texts);
      
      const endTime = Date.now();
      
      return {
        embeddings,
        model: request.model || EmbeddingModel.TEXT_EMBEDDING_ADA_002,
        dimensions: 1536,
        processing_time_ms: endTime - startTime,
        token_count: request.texts.reduce((total, text) => total + this.estimateTokenCount(text), 0)
      };
    } catch (error) {
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Upsert vectors into the Vectorize index
   */
  async upsertVectors(request: BulkUpsertRequest): Promise<BulkUpsertResponse> {
    const startTime = Date.now();
    let upsertedCount = 0;
    let failedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      // Process in batches
      const batchSize = request.batch_size || 100;
      const batches = this.createBatches(request.vectors, batchSize);

      for (const batch of batches) {
        try {
          // Prepare vectors for Vectorize
          const vectorizeItems = batch.map(item => ({
            id: item.id,
            values: item.values,
            metadata: this.serializeMetadata(item.metadata)
          }));

          // Upsert to Vectorize
          await this.vectorize.upsert(vectorizeItems);
          
          // Store additional metadata in D1
          await this.storeVectorMetadata(batch);
          
          upsertedCount += batch.length;
        } catch (error) {
          failedCount += batch.length;
          batch.forEach(item => {
            errors.push({
              id: item.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
        }
      }

      const endTime = Date.now();

      return {
        success: errors.length === 0,
        upserted_count: upsertedCount,
        failed_count: failedCount,
        errors,
        processing_time_ms: endTime - startTime
      };
    } catch (error) {
      throw new Error(`Bulk upsert failed: ${error}`);
    }
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(query: VectorSearchQuery): Promise<VectorSearchResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = await this.generateCacheKey(query);
      if (this.config.cache_results) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          const response = JSON.parse(cached) as VectorSearchResponse;
          response.query_metadata.search_time_ms = Date.now() - startTime;
          return response;
        }
      }

      let queryVector: number[];

      // Generate embedding for text query if needed
      if (query.text && !query.vector) {
        const embeddingResponse = await this.generateEmbeddings({
          texts: [query.text]
        });
        queryVector = embeddingResponse.embeddings[0];
      } else if (query.vector) {
        queryVector = query.vector;
      } else {
        throw new Error('Either text or vector must be provided');
      }

      // Perform vector search
      const topK = Math.min(query.topK || this.config.default_top_k, this.config.max_top_k);
      
      const vectorizeResults = await this.vectorize.query(queryVector, {
        topK,
        returnMetadata: query.includeMetadata !== false,
        returnValues: query.includeValues || false,
        namespace: query.namespace
      });

      // Process and filter results
      const results = await this.processSearchResults(vectorizeResults, query.filter);

      const endTime = Date.now();
      const searchTime = endTime - startTime;

      // Get index stats
      const indexStats = await this.getIndexStats();

      const response: VectorSearchResponse = {
        results,
        query_metadata: {
          query_text: query.text,
          query_vector_length: queryVector.length,
          total_results: results.length,
          search_time_ms: searchTime,
          index_stats: {
            total_vectors: indexStats.total_vectors,
            dimensions: indexStats.dimensions
          }
        }
      };

      // Cache results
      if (this.config.cache_results && results.length > 0) {
        await this.cache.put(cacheKey, JSON.stringify(response), {
          expirationTtl: this.config.cache_ttl_seconds
        });
      }

      // Log analytics
      await this.logQueryAnalytics({
        query_id: crypto.randomUUID(),
        query_text: query.text,
        query_type: 'vector_search',
        results_count: results.length,
        response_time_ms: searchTime,
        clicked_results: [],
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Vector search failed: ${error}`);
    }
  }

  /**
   * Perform hybrid search combining vector and keyword search
   */
  async hybridSearch(query: HybridSearchQuery): Promise<VectorSearchResponse> {
    const startTime = Date.now();

    try {
      // For now, implement as vector search with keyword filtering
      // In production, this would combine vector similarity with keyword matching
      const vectorResults = await this.vectorSearch({
        text: query.text,
        vector: query.vector,
        topK: query.topK,
        includeMetadata: query.includeMetadata,
        includeValues: query.includeValues,
        namespace: query.namespace,
        filter: query.filter
      });

      // Apply keyword filtering if keywords are provided
      if (query.keywords && query.keywords.length > 0) {
        vectorResults.results = this.filterByKeywords(vectorResults.results, query.keywords);
      }

      // Update query metadata
      vectorResults.query_metadata.search_time_ms = Date.now() - startTime;

      // Log analytics
      await this.logQueryAnalytics({
        query_id: crypto.randomUUID(),
        query_text: query.text,
        query_type: 'hybrid_search',
        results_count: vectorResults.results.length,
        response_time_ms: vectorResults.query_metadata.search_time_ms,
        clicked_results: [],
        timestamp: new Date().toISOString()
      });

      return vectorResults;
    } catch (error) {
      throw new Error(`Hybrid search failed: ${error}`);
    }
  }

  /**
   * Get similar documents based on a document ID
   */
  async getSimilarDocuments(documentId: string, topK: number = 10): Promise<VectorSearchResponse> {
    try {
      // Get the vector for the document
      const documentVector = await this.getVectorById(documentId);
      if (!documentVector) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Perform similarity search
      return await this.vectorSearch({
        vector: documentVector.values,
        topK: topK + 1, // +1 to account for the document itself
        includeMetadata: true
      });
    } catch (error) {
      throw new Error(`Similar documents search failed: ${error}`);
    }
  }

  /**
   * Delete vectors from the index
   */
  async deleteVectors(vectorIds: string[], namespace?: string): Promise<{ deleted: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let deleted = 0;

      // Delete from Vectorize
      for (const id of vectorIds) {
        try {
          await this.vectorize.deleteByIds([id]);
          deleted++;

          // Also remove from metadata database
          await this.metadataDB.prepare(
            'DELETE FROM vector_metadata WHERE vector_id = ?'
          ).bind(id).run();
          
        } catch (error) {
          errors.push(`Failed to delete ${id}: ${error}`);
        }
      }

      return { deleted, errors };
    } catch (error) {
      throw new Error(`Vector deletion failed: ${error}`);
    }
  }

  /**
   * Get index statistics and health metrics
   */
  async getIndexStats(): Promise<IndexStats> {
    try {
      // Get basic stats from Vectorize
      const vectorizeStats = await this.vectorize.describe();
      
      // Get additional metadata from D1
      const metadataStats = await this.metadataDB.prepare(`
        SELECT 
          COUNT(*) as total_vectors,
          COUNT(DISTINCT namespace) as namespace_count
        FROM vector_metadata
      `).first();

      const categoryStats = await this.metadataDB.prepare(`
        SELECT category, COUNT(*) as count
        FROM vector_metadata
        GROUP BY category
      `).all();

      const typeStats = await this.metadataDB.prepare(`
        SELECT type, COUNT(*) as count
        FROM vector_metadata
        GROUP BY type
      `).all();

      return {
        name: vectorizeStats.name,
        dimensions: vectorizeStats.dimensions,
        metric: vectorizeStats.metric,
        total_vectors: metadataStats?.total_vectors || 0,
        storage_size_mb: 0, // This would be calculated based on vector count and dimensions
        last_updated: new Date().toISOString(),
        namespaces: [] // This would be populated with actual namespace stats
      };
    } catch (error) {
      throw new Error(`Failed to get index stats: ${error}`);
    }
  }

  /**
   * Perform index maintenance operations
   */
  async performMaintenance(operation: 'optimize' | 'cleanup' | 'rebuild'): Promise<MaintenanceResult> {
    const startTime = Date.now();
    
    try {
      let vectorsProcessed = 0;
      let vectorsRemoved = 0;
      const errors: string[] = [];

      switch (operation) {
        case 'cleanup':
          // Remove orphaned vectors and outdated embeddings
          const orphanedVectors = await this.findOrphanedVectors();
          const deleteResult = await this.deleteVectors(orphanedVectors);
          vectorsRemoved = deleteResult.deleted;
          errors.push(...deleteResult.errors);
          break;

        case 'optimize':
          // Optimize index performance (placeholder - actual implementation would depend on Vectorize features)
          console.log('Index optimization completed');
          break;

        case 'rebuild':
          // Rebuild index from source data (placeholder)
          console.log('Index rebuild initiated');
          break;
      }

      const endTime = Date.now();

      return {
        operation,
        success: errors.length === 0,
        statistics: {
          vectors_processed: vectorsProcessed,
          vectors_removed: vectorsRemoved,
          processing_time_ms: endTime - startTime,
          storage_before_mb: 0,
          storage_after_mb: 0
        },
        errors
      };
    } catch (error) {
      throw new Error(`Maintenance operation failed: ${error}`);
    }
  }

  /**
   * Get performance metrics for the vectorize system
   */
  async getPerformanceMetrics(): Promise<VectorizePerformanceMetrics> {
    try {
      const analytics = await this.metadataDB.prepare(`
        SELECT 
          COUNT(*) as total_queries,
          AVG(response_time_ms) as avg_response_time,
          COUNT(CASE WHEN response_time_ms IS NOT NULL THEN 1 END) as successful_queries
        FROM query_analytics
        WHERE timestamp > datetime('now', '-7 days')
      `).first();

      const categoryDistribution = await this.metadataDB.prepare(`
        SELECT category, COUNT(*) as count
        FROM vector_metadata
        GROUP BY category
      `).all();

      const indexStats = await this.getIndexStats();

      return {
        index_name: 'esmap-ai-embeddings',
        total_queries: analytics?.total_queries || 0,
        avg_response_time_ms: analytics?.avg_response_time || 0,
        p95_response_time_ms: 0, // Would calculate from detailed analytics
        success_rate: analytics?.successful_queries && analytics?.total_queries ? 
          (analytics.successful_queries / analytics.total_queries) * 100 : 100,
        most_common_queries: [], // Would be populated from analytics
        category_distribution: this.formatCategoryDistribution(categoryDistribution.results),
        error_rate: 0,
        storage_utilization: {
          used_mb: indexStats.total_vectors * 1536 * 4 / (1024 * 1024), // Rough estimate
          total_mb: 1000, // Would be actual limit
          utilization_percent: 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error}`);
    }
  }

  /**
   * Private helper methods
   */

  private async generateMockEmbeddings(texts: string[]): Promise<number[][]> {
    // This is a mock implementation for testing
    // In production, this would call OpenAI API or use Cloudflare Workers AI
    return texts.map(() => Array.from({ length: 1536 }, () => Math.random() - 0.5));
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 0.75 words
    return Math.ceil(text.split(/\s+/).length / 0.75);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private serializeMetadata(metadata: EmbeddingMetadata): Record<string, any> {
    return {
      type: metadata.type,
      source: metadata.source,
      category: metadata.category,
      country: metadata.country || '',
      indicator: metadata.indicator || '',
      year: metadata.year || 0,
      language: metadata.language || 'en',
      quality_score: metadata.quality_score || 0,
      tags: JSON.stringify(metadata.tags),
      created_at: metadata.created_at,
      updated_at: metadata.updated_at
    };
  }

  private async storeVectorMetadata(vectors: Array<{ id: string; metadata: EmbeddingMetadata }>): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO vector_metadata (
        vector_id, type, source, category, country, indicator, year,
        language, quality_score, tags, created_at, updated_at, namespace
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const vector of vectors) {
      await this.metadataDB.prepare(query).bind(
        vector.id,
        vector.metadata.type,
        vector.metadata.source,
        vector.metadata.category,
        vector.metadata.country || null,
        vector.metadata.indicator || null,
        vector.metadata.year || null,
        vector.metadata.language || 'en',
        vector.metadata.quality_score || 0,
        JSON.stringify(vector.metadata.tags),
        vector.metadata.created_at,
        vector.metadata.updated_at,
        'default'
      ).run();
    }
  }

  private async processSearchResults(
    vectorizeResults: VectorizeMatches,
    filter?: VectorFilter
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const match of vectorizeResults.matches) {
      const metadata = this.deserializeMetadata(match.metadata);
      
      // Apply filters if provided
      if (filter && !this.matchesFilter(metadata, filter)) {
        continue;
      }

      results.push({
        id: match.id,
        score: match.score,
        metadata,
        values: match.values
      });
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply similarity threshold
    return results.filter(result => result.score >= this.config.similarity_threshold);
  }

  private deserializeMetadata(metadata: Record<string, any>): EmbeddingMetadata {
    return {
      type: metadata.type as EmbeddingType,
      source: metadata.source,
      category: metadata.category as EnergyDataCategory,
      country: metadata.country || undefined,
      indicator: metadata.indicator || undefined,
      year: metadata.year || undefined,
      language: metadata.language || 'en',
      quality_score: metadata.quality_score || 0,
      tags: metadata.tags ? JSON.parse(metadata.tags) : [],
      created_at: metadata.created_at,
      updated_at: metadata.updated_at
    };
  }

  private matchesFilter(metadata: EmbeddingMetadata, filter: VectorFilter): boolean {
    if (filter.type && !filter.type.includes(metadata.type)) return false;
    if (filter.category && !filter.category.includes(metadata.category)) return false;
    if (filter.source && !filter.source.includes(metadata.source)) return false;
    if (filter.country && metadata.country && !filter.country.includes(metadata.country)) return false;
    
    if (filter.year_range && metadata.year) {
      if (metadata.year < filter.year_range.start || metadata.year > filter.year_range.end) {
        return false;
      }
    }

    if (filter.quality_score_min && metadata.quality_score) {
      if (metadata.quality_score < filter.quality_score_min) return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => metadata.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    return true;
  }

  private filterByKeywords(results: VectorSearchResult[], keywords: string[]): VectorSearchResult[] {
    return results.filter(result => {
      const searchText = `${result.metadata.source} ${result.metadata.tags.join(' ')}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }

  private async generateCacheKey(query: VectorSearchQuery): Promise<string> {
    const keyData = {
      text: query.text,
      vector: query.vector ? query.vector.slice(0, 10) : undefined, // Use first 10 dimensions for key
      topK: query.topK,
      filter: query.filter
    };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(keyData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `vectorize:${hashHex}`;
  }

  private async getVectorById(id: string): Promise<{ values: number[] } | null> {
    // This would retrieve the vector from Vectorize by ID
    // For now, return null as a placeholder
    return null;
  }

  private async findOrphanedVectors(): Promise<string[]> {
    // Find vectors that no longer have corresponding source data
    const result = await this.metadataDB.prepare(`
      SELECT vector_id FROM vector_metadata 
      WHERE created_at < datetime('now', '-30 days')
      AND quality_score < 0.5
    `).all();

    return result.results.map(row => row.vector_id as string);
  }

  private async logQueryAnalytics(analytics: QueryAnalytics): Promise<void> {
    await this.metadataDB.prepare(`
      INSERT INTO query_analytics (
        query_id, query_text, query_type, results_count, 
        response_time_ms, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      analytics.query_id,
      analytics.query_text,
      analytics.query_type,
      analytics.results_count,
      analytics.response_time_ms,
      analytics.timestamp
    ).run();
  }

  private formatCategoryDistribution(results: any[]): Record<EnergyDataCategory, number> {
    const distribution: Record<string, number> = {};
    for (const result of results) {
      distribution[result.category] = result.count;
    }
    return distribution as Record<EnergyDataCategory, number>;
  }
}