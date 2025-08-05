/**
 * Data Source Resilience and Failover Types
 * Comprehensive type definitions for multi-source data fusion and failover systems
 */

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  priority: number; // 1 = primary, 2 = secondary, etc.
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number; // milliseconds
  retryPolicy: RetryPolicy;
  healthCheck: {
    endpoint: string;
    interval: number; // seconds
    timeout: number; // milliseconds
  };
  compliance: ComplianceConfig;
  metadata: DataSourceMetadata;
}

export enum DataSourceType {
  API = 'api',
  RSS = 'rss',
  WEB_SCRAPING = 'web_scraping',
  DATABASE = 'database',
  FILE_FEED = 'file_feed',
  STREAM = 'stream',
  SOCIAL_MEDIA = 'social_media',
  CROWDSOURCED = 'crowdsourced',
  COMMERCIAL = 'commercial',
  GOVERNMENT = 'government',
  ACADEMIC = 'academic'
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  jitter: boolean;
}

export interface ComplianceConfig {
  respectsRobotsTxt: boolean;
  hasTermsOfService: boolean;
  requiresAttribution: boolean;
  dataUsageRestrictions: string[];
  privacyPolicyUrl?: string;
  lastComplianceCheck: string;
  complianceNotes: string;
}

export interface DataSourceMetadata {
  description: string;
  dataFormat: string;
  updateFrequency: string;
  coverage: {
    geographic: string[];
    temporal: {
      startDate?: string;
      endDate?: string;
    };
    topics: string[];
  };
  quality: {
    accuracy: number; // 0-1
    completeness: number; // 0-1
    timeliness: number; // 0-1
    reliability: number; // 0-1
  };
  lastUpdated: string;
  maintainer: {
    name: string;
    contact: string;
    organization: string;
  };
}

export interface DataSourceHealth {
  sourceId: string;
  status: HealthStatus;
  lastChecked: string;
  responseTime: number; // milliseconds
  successRate: number; // 0-1 over last 24 hours
  consecutiveFailures: number;
  lastError?: string;
  metrics: {
    requestsToday: number;
    errorsToday: number;
    avgResponseTime: number;
    dataQualityScore: number;
  };
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CIRCUIT_OPEN = 'circuit_open',
  MAINTENANCE = 'maintenance'
}

export interface CircuitBreakerState {
  sourceId: string;
  state: CircuitState;
  failureCount: number;
  lastFailure?: string;
  nextAttempt?: string;
  successCount: number;
  halfOpenSuccessThreshold: number;
}

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, requests blocked
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface DataFusionRequest {
  dataType: string;
  parameters: Record<string, any>;
  requiredSources?: string[];
  excludedSources?: string[];
  confidenceThreshold: number;
  maxSources: number;
  timeoutMs: number;
}

export interface DataFusionResult<T = any> {
  data: T;
  confidence: number;
  sources: DataSourceContribution[];
  fusionMethod: string;
  processingTime: number;
  warnings: string[];
  metadata: {
    requestId: string;
    timestamp: string;
    totalSources: number;
    successfulSources: number;
    failedSources: number;
  };
}

export interface DataSourceContribution {
  sourceId: string;
  data: any;
  confidence: number;
  weight: number;
  responseTime: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
}

export interface FusionAlgorithm {
  name: string;
  description: string;
  applicableDataTypes: string[];
  calculateConfidence: (contributions: DataSourceContribution[]) => number;
  fuseData: (contributions: DataSourceContribution[]) => any;
  validateResult: (result: any) => boolean;
}

export interface RealTimeDataStream {
  id: string;
  sourceId: string;
  type: StreamType;
  url: string;
  format: 'json' | 'xml' | 'csv' | 'rss' | 'atom';
  pollInterval?: number; // for polling-based streams
  filters?: Record<string, any>;
  transformations?: DataTransformation[];
  isActive: boolean;
  lastPoll?: string;
  errorCount: number;
}

export enum StreamType {
  RSS_FEED = 'rss_feed',
  ATOM_FEED = 'atom_feed',
  JSON_API = 'json_api',
  WEBSOCKET = 'websocket',
  SSE = 'server_sent_events',
  TWITTER_API = 'twitter_api',
  NEWS_API = 'news_api',
  SOCIAL_MEDIA = 'social_media'
}

export interface DataTransformation {
  type: 'filter' | 'map' | 'validate' | 'enrich';
  config: Record<string, any>;
  order: number;
}

export interface WebScrapingJob {
  id: string;
  name: string;
  targetUrl: string;
  selectors: Record<string, string>;
  schedule: string; // cron expression
  respectRobotsTxt: boolean;
  rateLimit: {
    delay: number; // milliseconds between requests
    concurrent: number; // max concurrent requests
  };
  userAgent: string;
  headers: Record<string, string>;
  outputFormat: 'json' | 'csv' | 'xml';
  dataValidation: ValidationRule[];
  lastRun?: string;
  nextRun?: string;
  status: JobStatus;
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'range' | 'custom';
  config: Record<string, any>;
}

export interface CrowdsourcedDataSource {
  id: string;
  name: string;
  type: 'openstreetmap' | 'wikidata' | 'citizen_science' | 'community_monitoring';
  apiEndpoint: string;
  queryBuilder: (params: any) => string;
  dataMapper: (rawData: any) => any;
  qualityFilters: QualityFilter[];
  contributorVerification: boolean;
  minimumContributors: number;
}

export interface QualityFilter {
  name: string;
  condition: string;
  threshold: number;
}

export interface CommercialDataBroker {
  id: string;
  name: string;
  baseUrl: string;
  authentication: {
    type: 'api_key' | 'oauth' | 'basic_auth';
    credentials: Record<string, string>;
  };
  dataProducts: DataProduct[];
  pricing: PricingModel;
  usage: {
    requestsToday: number;
    costToday: number;
    monthlyLimit: number;
    costLimit: number;
  };
}

export interface DataProduct {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  schema: Record<string, any>;
  costPerRequest: number;
  currency: string;
  dataRetention: number; // days
}

export interface PricingModel {
  type: 'per_request' | 'subscription' | 'tiered';
  tiers?: PricingTier[];
  subscriptionCost?: number;
  currency: string;
}

export interface PricingTier {
  name: string;
  minRequests: number;
  maxRequests: number;
  costPerRequest: number;
}

export interface DataSourceReliabilityMetrics {
  sourceId: string;
  period: string; // e.g., '24h', '7d', '30d'
  uptime: number; // percentage
  averageResponseTime: number; // milliseconds
  successRate: number; // percentage
  dataQualityScore: number; // 0-1
  consistencyScore: number; // 0-1
  freshnessScore: number; // 0-1
  costEfficiency: number; // data quality per unit cost
  userSatisfactionScore: number; // 0-1
  incidents: ReliabilityIncident[];
}

export interface ReliabilityIncident {
  id: string;
  timestamp: string;
  type: 'outage' | 'slow_response' | 'data_quality' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  duration: number; // minutes
  impact: string;
  resolution: string;
  preventionMeasures: string[];
}

export interface FailoverEvent {
  id: string;
  timestamp: string;
  primarySource: string;
  failoverSource: string;
  reason: string;
  dataType: string;
  impactDuration: number; // milliseconds
  dataLoss: boolean;
  automaticRecovery: boolean;
}

export interface DataSourceAlert {
  id: string;
  sourceId: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export enum AlertType {
  SOURCE_DOWN = 'source_down',
  HIGH_LATENCY = 'high_latency',
  DATA_QUALITY_ISSUE = 'data_quality_issue',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  COST_THRESHOLD_EXCEEDED = 'cost_threshold_exceeded',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open'
}

export interface ResilienceConfig {
  globalTimeout: number; // milliseconds
  maxConcurrentRequests: number;
  circuitBreakerThreshold: number; // failure percentage to open circuit
  circuitBreakerTimeout: number; // milliseconds before trying half-open
  fusionConfidenceThreshold: number; // minimum confidence for fusion results
  alertingEnabled: boolean;
  alertWebhooks: string[];
  metricsRetentionDays: number;
}

export interface DataQualityAssessment {
  accuracy: number; // 0-1
  completeness: number; // 0-1
  consistency: number; // 0-1
  timeliness: number; // 0-1
  validity: number; // 0-1
  uniqueness: number; // 0-1
  overall: number; // weighted average
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedFields: string[];
  count: number;
  percentage: number;
}

export interface LegalComplianceCheck {
  sourceId: string;
  lastChecked: string;
  complianceStatus: 'compliant' | 'non_compliant' | 'needs_review';
  checks: ComplianceCheckResult[];
  recommendations: string[];
  nextReviewDate: string;
}

export interface ComplianceCheckResult {
  checkType: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  evidence?: string;
  remediation?: string;
}