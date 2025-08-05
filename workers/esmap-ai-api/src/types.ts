export interface Env {
  // Cloudflare bindings
  DB: D1Database; // D1 database is now available
  DATA_BUCKET?: R2Bucket;
  VECTORIZE_INDEX?: VectorizeIndex;
  AI?: Ai;
  CACHE?: KVNamespace;
  
  // Environment variables
  ENVIRONMENT: string;
  WORLD_BANK_API_KEY?: string;
  NASA_POWER_API_KEY?: string;
  OPENSTREETMAP_API_KEY?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    storage: 'connected' | 'disconnected';
    ai: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected';
  };
  uptime: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  requestId: string;
  metadata?: Record<string, any>;
}