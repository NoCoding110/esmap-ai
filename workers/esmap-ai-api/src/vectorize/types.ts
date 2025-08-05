/**
 * Vectorize Types and Interfaces for ESMAP AI Platform
 */

export interface EmbeddingRequest {
  id: string;
  text: string;
  metadata: EmbeddingMetadata;
  namespace?: string;
}

export interface EmbeddingMetadata {
  type: EmbeddingType;
  source: string;
  category: EnergyDataCategory;
  country?: string;
  indicator?: string;
  year?: number;
  language?: string;
  quality_score?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export enum EmbeddingType {
  DOCUMENT = 'document',
  DATASET_DESCRIPTION = 'dataset_description',
  INDICATOR_DEFINITION = 'indicator_definition',
  COUNTRY_PROFILE = 'country_profile',
  POLICY_TEXT = 'policy_text',
  RESEARCH_PAPER = 'research_paper',
  PROJECT_DESCRIPTION = 'project_description',
  TECHNICAL_SPECIFICATION = 'technical_specification'
}

export enum EnergyDataCategory {
  ENERGY_ACCESS = 'energy_access',
  RENEWABLE_ENERGY = 'renewable_energy',
  ENERGY_EFFICIENCY = 'energy_efficiency',
  GRID_INFRASTRUCTURE = 'grid_infrastructure',
  CLEAN_COOKING = 'clean_cooking',
  CLIMATE_DATA = 'climate_data',
  POLICY_REGULATORY = 'policy_regulatory',
  FINANCE_INVESTMENT = 'finance_investment',
  GENDER_INCLUSION = 'gender_inclusion',
  RURAL_ELECTRIFICATION = 'rural_electrification'
}

export interface VectorSearchQuery {
  text?: string;
  vector?: number[];
  topK?: number;
  includeMetadata?: boolean;
  includeValues?: boolean;
  namespace?: string;
  filter?: VectorFilter;
}

export interface VectorFilter {
  type?: EmbeddingType[];
  category?: EnergyDataCategory[];
  source?: string[];
  country?: string[];
  year_range?: {
    start: number;
    end: number;
  };
  tags?: string[];
  quality_score_min?: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: EmbeddingMetadata;
  values?: number[];
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  query_metadata: {
    query_text?: string;
    query_vector_length?: number;
    total_results: number;
    search_time_ms: number;
    index_stats: {
      total_vectors: number;
      dimensions: number;
    };
  };
}

export interface EmbeddingGenerationRequest {
  texts: string[];
  model?: EmbeddingModel;
  batch_size?: number;
  normalize?: boolean;
}

export interface EmbeddingGenerationResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  processing_time_ms: number;
  token_count?: number;
}

export enum EmbeddingModel {
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  MULTILINGUAL_E5_LARGE = 'multilingual-e5-large',
  BGE_LARGE_EN_V1_5 = 'bge-large-en-v1.5'
}

export interface IndexStats {
  name: string;
  dimensions: number;
  metric: string;
  total_vectors: number;
  storage_size_mb: number;
  last_updated: string;
  namespaces: NamespaceStats[];
}

export interface NamespaceStats {
  name: string;
  vector_count: number;
  categories: Record<EnergyDataCategory, number>;
  types: Record<EmbeddingType, number>;
  sources: Record<string, number>;
}

export interface BulkUpsertRequest {
  vectors: VectorUpsertItem[];
  namespace?: string;
  batch_size?: number;
}

export interface VectorUpsertItem {
  id: string;
  values: number[];
  metadata: EmbeddingMetadata;
}

export interface BulkUpsertResponse {
  success: boolean;
  upserted_count: number;
  failed_count: number;
  errors: UpsertError[];
  processing_time_ms: number;
}

export interface UpsertError {
  id: string;
  error: string;
}

export interface VectorIndexMaintenance {
  operation: 'optimize' | 'cleanup' | 'rebuild' | 'backup';
  parameters?: Record<string, any>;
  scheduled_at?: string;
}

export interface MaintenanceResult {
  operation: string;
  success: boolean;
  statistics: {
    vectors_processed: number;
    vectors_removed: number;
    processing_time_ms: number;
    storage_before_mb: number;
    storage_after_mb: number;
  };
  errors: string[];
}

export interface SemanticSearchConfig {
  default_top_k: number;
  max_top_k: number;
  similarity_threshold: number;
  result_diversity_factor: number;
  enable_reranking: boolean;
  cache_results: boolean;
  cache_ttl_seconds: number;
}

export interface HybridSearchQuery extends VectorSearchQuery {
  keywords?: string[];
  keyword_weight?: number;
  vector_weight?: number;
  combine_method?: 'weighted_sum' | 'rrf' | 'linear_combination';
}

export interface EnergyDomainVector {
  id: string;
  content: string;
  embedding: number[];
  metadata: EnergyDomainMetadata;
}

export interface EnergyDomainMetadata extends EmbeddingMetadata {
  energy_indicators?: string[];
  sdg_targets?: string[];
  geographic_scope?: 'global' | 'regional' | 'national' | 'subnational';
  temporal_scope?: {
    start_year: number;
    end_year: number;
  };
  data_quality?: {
    completeness: number;
    accuracy: number;
    timeliness: number;
  };
  esmap_program?: string[];
  partner_organizations?: string[];
}

export interface QueryAnalytics {
  query_id: string;
  query_text?: string;
  query_type: 'vector_search' | 'hybrid_search' | 'keyword_search';
  results_count: number;
  response_time_ms: number;
  user_satisfaction_score?: number;
  clicked_results: string[];
  timestamp: string;
}

export interface VectorizePerformanceMetrics {
  index_name: string;
  total_queries: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  success_rate: number;
  most_common_queries: Array<{
    query: string;
    count: number;
    avg_response_time: number;
  }>;
  category_distribution: Record<EnergyDataCategory, number>;
  error_rate: number;
  storage_utilization: {
    used_mb: number;
    total_mb: number;
    utilization_percent: number;
  };
}