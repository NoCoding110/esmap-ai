export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff: boolean;
  };
  timeout: number;
  fallbackSources?: string[];
}

export interface DataSourceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  timestamp: string;
  requestId: string;
  rateLimitRemaining?: number;
  nextAllowedRequest?: string;
}

export interface RateLimiter {
  checkLimit(sourceId: string): Promise<boolean>;
  updateUsage(sourceId: string): Promise<void>;
  getRemainingRequests(sourceId: string): Promise<number>;
  getResetTime(sourceId: string): Promise<Date>;
}

export interface DataValidator<T> {
  validate(data: unknown): Promise<ValidationResult<T>>;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export abstract class BaseDataSource<T = any> {
  protected config: DataSourceConfig;
  protected rateLimiter: RateLimiter;
  protected validator: DataValidator<T>;

  constructor(
    config: DataSourceConfig,
    rateLimiter: RateLimiter,
    validator: DataValidator<T>
  ) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.validator = validator;
  }

  abstract fetchData(params: Record<string, any>): Promise<DataSourceResponse<T>>;
  
  protected async makeRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const canMakeRequest = await this.rateLimiter.checkLimit(this.config.name);
    if (!canMakeRequest) {
      const resetTime = await this.rateLimiter.getResetTime(this.config.name);
      throw new Error(`Rate limit exceeded. Next request allowed at: ${resetTime.toISOString()}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'ESMAP-AI-Platform/1.0.0',
          ...options.headers
        }
      });

      await this.rateLimiter.updateUsage(this.config.name);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected async retryRequest<R>(
    operation: () => Promise<R>,
    retryCount: number = 0
  ): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.config.retryConfig.maxRetries) {
        throw error;
      }

      const delay = this.config.retryConfig.exponentialBackoff
        ? this.config.retryConfig.backoffMs * Math.pow(2, retryCount)
        : this.config.retryConfig.backoffMs;

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(operation, retryCount + 1);
    }
  }
}