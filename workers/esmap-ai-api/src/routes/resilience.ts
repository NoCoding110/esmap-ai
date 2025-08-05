/**
 * Resilience API Routes
 * Provides endpoints for data source resilience, failover, and monitoring
 */

import { ResilienceManager } from '../resilience/resilience-manager';
import { DataSourceConfig, DataSourceType } from '../resilience/types';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  VECTORIZE_INDEX: Vectorize;
  DATA_BUCKET: R2Bucket;
}

export class ResilienceRoutes {
  private resilienceManager: ResilienceManager;

  constructor(env: Env) {
    this.resilienceManager = new ResilienceManager({
      globalTimeout: 10000,
      maxConcurrentRequests: 50,
      circuitBreakerThreshold: 0.6,
      fusionConfidenceThreshold: 0.75,
      alertingEnabled: true,
      metricsRetentionDays: 30
    });

    // Initialize with some default data sources
    this.initializeDefaultSources();
  }

  /**
   * Initialize default data sources
   */
  private initializeDefaultSources(): void {
    // World Bank API
    this.resilienceManager.registerDataSource({
      id: 'world-bank-api',
      name: 'World Bank Open Data API',
      type: DataSourceType.API,
      priority: 1,
      baseUrl: 'https://api.worldbank.org/v2',
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      timeout: 5000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 5000,
        jitter: true
      },
      healthCheck: {
        endpoint: '/countries?format=json',
        interval: 300,
        timeout: 3000
      },
      compliance: {
        respectsRobotsTxt: true,
        hasTermsOfService: true,
        requiresAttribution: true,
        dataUsageRestrictions: ['Non-commercial use encouraged'],
        privacyPolicyUrl: 'https://www.worldbank.org/en/about/legal/privacy-notice',
        lastComplianceCheck: new Date().toISOString(),
        complianceNotes: 'World Bank Open Data Initiative'
      },
      metadata: {
        description: 'World Bank development indicators and statistics',
        dataFormat: 'json',
        updateFrequency: 'Annual',
        coverage: {
          geographic: ['Global'],
          temporal: { startDate: '1960-01-01' },
          topics: ['Development', 'Economics', 'Energy', 'Environment']
        },
        quality: {
          accuracy: 0.95,
          completeness: 0.90,
          timeliness: 0.85,
          reliability: 0.98,
          overall: 0.92
        },
        lastUpdated: new Date().toISOString(),
        maintainer: {
          name: 'World Bank Group',
          contact: 'data@worldbank.org',
          organization: 'World Bank'
        }
      }
    });

    // NASA POWER API
    this.resilienceManager.registerDataSource({
      id: 'nasa-power-api',
      name: 'NASA POWER API',
      type: DataSourceType.API,
      priority: 2,
      baseUrl: 'https://power.larc.nasa.gov/api',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 5000
      },
      timeout: 8000,
      retryPolicy: {
        maxAttempts: 2,
        backoffStrategy: 'linear',
        initialDelay: 2000,
        maxDelay: 8000,
        jitter: false
      },
      healthCheck: {
        endpoint: '/temporal/daily/point',
        interval: 600,
        timeout: 5000
      },
      compliance: {
        respectsRobotsTxt: true,
        hasTermsOfService: true,
        requiresAttribution: true,
        dataUsageRestrictions: ['Academic and research use'],
        lastComplianceCheck: new Date().toISOString(),
        complianceNotes: 'NASA Open Data Policy'
      },
      metadata: {
        description: 'NASA satellite-based climate and weather data',
        dataFormat: 'json',
        updateFrequency: 'Daily',
        coverage: {
          geographic: ['Global'],
          temporal: { startDate: '1981-01-01' },
          topics: ['Climate', 'Weather', 'Solar', 'Meteorology']
        },
        quality: {
          accuracy: 0.92,
          completeness: 0.95,
          timeliness: 0.90,
          reliability: 0.94,
          overall: 0.93
        },
        lastUpdated: new Date().toISOString(),
        maintainer: {
          name: 'NASA Langley Research Center',
          contact: 'support-power@larc.nasa.gov',
          organization: 'NASA'
        }
      }
    });
  }

  /**
   * Get resilience system status
   * GET /api/v1/resilience/status
   */
  async getStatus(request: Request): Promise<Response> {
    try {
      const status = this.resilienceManager.getResilienceStatus();
      
      return new Response(JSON.stringify({
        success: true,
        data: status
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get resilience status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Perform comprehensive health check
   * GET /api/v1/resilience/health
   */
  async performHealthCheck(request: Request): Promise<Response> {
    try {
      const healthCheck = await this.resilienceManager.performHealthCheck();
      
      return new Response(JSON.stringify({
        success: true,
        data: healthCheck
      }), {
        status: healthCheck.status === 'healthy' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Execute resilient data request
   * POST /api/v1/resilience/request
   */
  async executeRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      // Validate request
      if (!body.dataType) {
        return new Response(JSON.stringify({
          success: false,
          error: 'dataType is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const dataRequest = {
        dataType: body.dataType,
        parameters: body.parameters || {},
        strategy: body.strategy || 'failover',
        sources: body.sources,
        quality: body.quality,
        budget: body.budget
      };

      const result = await this.resilienceManager.executeRequest(dataRequest);
      
      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get circuit breaker status
   * GET /api/v1/resilience/circuit-breakers
   */
  async getCircuitBreakerStatus(request: Request): Promise<Response> {
    try {
      const circuitBreaker = this.resilienceManager.getCircuitBreakerManager();
      const states = circuitBreaker.getAllStates();
      const metrics = circuitBreaker.getAllMetrics();
      const summary = circuitBreaker.getSummaryStats();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          states,
          metrics: Object.fromEntries(metrics),
          summary
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get circuit breaker status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get reliability metrics
   * GET /api/v1/resilience/reliability
   */
  async getReliabilityMetrics(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sourceId = url.searchParams.get('sourceId');
      
      const reliabilityTracker = this.resilienceManager.getReliabilityTracker();
      
      if (sourceId) {
        const metrics = reliabilityTracker.getMetrics(sourceId);
        const report = reliabilityTracker.generateReport(sourceId);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            metrics,
            report
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        const allMetrics = reliabilityTracker.getAllMetrics();
        const report = reliabilityTracker.generateReport();
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            metrics: allMetrics,
            report
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get reliability metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get failover statistics
   * GET /api/v1/resilience/failover
   */
  async getFailoverStats(request: Request): Promise<Response> {
    try {
      const failoverManager = this.resilienceManager.getFailoverManager();
      const stats = failoverManager.getFailoverStats();
      const history = failoverManager.getFailoverHistory();
      const sources = failoverManager.getSources();
      const healthStatus = failoverManager.getHealthStatus();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          stats,
          history: history.slice(-50), // Last 50 events
          sources: sources.length,
          healthStatus
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get failover statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get real-time feed status
   * GET /api/v1/resilience/feeds
   */
  async getFeedStatus(request: Request): Promise<Response> {
    try {
      const feedManager = this.resilienceManager.getFeedManager();
      const streams = feedManager.getStreams();
      const metrics = feedManager.getStreamMetrics();
      const activeCount = feedManager.getActiveStreamsCount();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          streams,
          metrics,
          activeStreams: activeCount,
          totalStreams: streams.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get feed status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get web scraping status
   * GET /api/v1/resilience/scraping
   */
  async getScrapingStatus(request: Request): Promise<Response> {
    try {
      const webScraper = this.resilienceManager.getWebScraper();
      const jobs = webScraper.getAllJobs();
      const sessions = webScraper.getAllSessions();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          jobs,
          sessions: sessions.slice(-20), // Last 20 sessions
          totalJobs: jobs.length,
          activeSessions: sessions.filter(s => !s.endTime).length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get scraping status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get alternative data sources
   * GET /api/v1/resilience/alternative-sources
   */
  async getAlternativeSources(request: Request): Promise<Response> {
    try {
      const alternativeSources = this.resilienceManager.getAlternativeSources();
      
      const government = alternativeSources.getGovernmentPortals();
      const academic = alternativeSources.getAcademicDatabases();
      const crowdsourced = alternativeSources.getCrowdsourcedSources();
      const citizenScience = alternativeSources.getCitizenScienceProjects();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          government,
          academic,
          crowdsourced,
          citizenScience,
          summary: {
            governmentPortals: government.length,
            academicDatabases: academic.length,
            crowdsourcedSources: crowdsourced.length,
            citizenScienceProjects: citizenScience.length
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get alternative sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get commercial broker status
   * GET /api/v1/resilience/commercial-brokers
   */
  async getCommercialBrokerStatus(request: Request): Promise<Response> {
    try {
      const commercialBrokers = this.resilienceManager.getCommercialBrokers();
      const brokers = commercialBrokers.getBrokers();
      const usageReport = commercialBrokers.generateUsageReport('30d');
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          brokers,
          usageReport,
          totalBrokers: brokers.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get commercial broker status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get compliance status
   * GET /api/v1/resilience/compliance
   */
  async getComplianceStatus(request: Request): Promise<Response> {
    try {
      const complianceChecks = this.resilienceManager.getComplianceChecks();
      
      const compliant = complianceChecks.filter(c => c.complianceStatus === 'compliant').length;
      const nonCompliant = complianceChecks.filter(c => c.complianceStatus === 'non_compliant').length;
      const needsReview = complianceChecks.filter(c => c.complianceStatus === 'needs_review').length;
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          checks: complianceChecks,
          summary: {
            total: complianceChecks.length,
            compliant,
            nonCompliant,
            needsReview,
            complianceRate: complianceChecks.length > 0 ? (compliant / complianceChecks.length) * 100 : 100
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get compliance status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Perform system maintenance
   * POST /api/v1/resilience/maintenance
   */
  async performMaintenance(request: Request): Promise<Response> {
    try {
      await this.resilienceManager.performMaintenance();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Maintenance completed successfully',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Register new data source
   * POST /api/v1/resilience/sources
   */
  async registerDataSource(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      // Validate required fields
      if (!body.id || !body.name || !body.type || !body.baseUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: id, name, type, baseUrl'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const config: DataSourceConfig = {
        id: body.id,
        name: body.name,
        type: body.type,
        priority: body.priority || 5,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        rateLimit: body.rateLimit || {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        timeout: body.timeout || 10000,
        retryPolicy: body.retryPolicy || {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
          maxDelay: 10000,
          jitter: true
        },
        healthCheck: body.healthCheck || {
          endpoint: '/health',
          interval: 300,
          timeout: 5000
        },
        compliance: body.compliance || {
          respectsRobotsTxt: true,
          hasTermsOfService: false,
          requiresAttribution: false,
          dataUsageRestrictions: [],
          lastComplianceCheck: new Date().toISOString(),
          complianceNotes: 'User-registered source'
        },
        metadata: body.metadata || {
          description: body.name,
          dataFormat: 'json',
          updateFrequency: 'Unknown',
          coverage: {
            geographic: ['Unknown'],
            temporal: {},
            topics: ['General']
          },
          quality: {
            accuracy: 0.8,
            completeness: 0.8,
            timeliness: 0.8,
            reliability: 0.8,
            overall: 0.8
          },
          lastUpdated: new Date().toISOString(),
          maintainer: {
            name: 'Unknown',
            contact: '',
            organization: 'Unknown'
          }
        }
      };

      this.resilienceManager.registerDataSource(config);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Data source ${config.name} registered successfully`,
        data: { id: config.id }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to register data source',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get registered data sources
   * GET /api/v1/resilience/sources
   */
  async getDataSources(request: Request): Promise<Response> {
    try {
      const sources = this.resilienceManager.getRegisteredSources();
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          sources,
          count: sources.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get data sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}