/**
 * ETL Worker for Cloudflare Workers
 * Handles ETL pipeline execution and management
 */

import { ESMAPETLPipeline } from './pipeline/esmap-etl-pipeline';
import { ETLPipelineConfig, DataSource, ETLMetrics } from './types';

export interface ETLWorkerEnv {
  ESMAP_DB: D1Database;
  ETL_CACHE: KVNamespace;
  QUEUE: Queue;
}

interface ETLJobRequest {
  jobId: string;
  pipelineName: string;
  sources: string[];
  options?: {
    batchSize?: number;
    parallelism?: number;
  };
}

export class ETLWorker {
  private env: ETLWorkerEnv;
  private activePipelines: Map<string, ESMAPETLPipeline> = new Map();

  constructor(env: ETLWorkerEnv) {
    this.env = env;
  }

  /**
   * Handle incoming ETL job requests
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/etl/start':
        return this.startETLJob(request);
      
      case '/etl/status':
        return this.getJobStatus(request);
      
      case '/etl/metrics':
        return this.getMetrics(request);
      
      case '/etl/sources':
        return this.getAvailableSources();
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Start a new ETL job
   */
  private async startETLJob(request: Request): Promise<Response> {
    try {
      const jobRequest: ETLJobRequest = await request.json();
      
      // Validate request
      if (!jobRequest.jobId || !jobRequest.pipelineName || !jobRequest.sources?.length) {
        return new Response(
          JSON.stringify({ error: 'Invalid job request' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create pipeline configuration
      const config = await this.createPipelineConfig(jobRequest);
      
      // Create and start pipeline
      const pipeline = new ESMAPETLPipeline(config);
      this.activePipelines.set(jobRequest.jobId, pipeline);

      // Queue the job for async processing
      await this.env.QUEUE.send({
        type: 'etl-job',
        jobId: jobRequest.jobId,
        config
      });

      // Store initial job status
      await this.env.ETL_CACHE.put(
        `job:${jobRequest.jobId}`,
        JSON.stringify({
          status: 'queued',
          startTime: new Date().toISOString(),
          pipelineName: jobRequest.pipelineName,
          sources: jobRequest.sources
        }),
        { expirationTtl: 86400 } // 24 hours
      );

      return new Response(
        JSON.stringify({
          jobId: jobRequest.jobId,
          status: 'queued',
          message: 'ETL job queued successfully'
        }),
        { 
          status: 202, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Failed to start ETL job:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to start ETL job' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Get job status
   */
  private async getJobStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jobStatus = await this.env.ETL_CACHE.get(`job:${jobId}`);
    
    if (!jobStatus) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const status = JSON.parse(jobStatus);
    
    // Get current metrics if job is active
    const pipeline = this.activePipelines.get(jobId);
    if (pipeline) {
      status.metrics = pipeline.getMetrics();
      status.stats = pipeline.getPipelineStats();
    }

    return new Response(
      JSON.stringify(status),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get pipeline metrics
   */
  private async getMetrics(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      // Return all active pipeline metrics
      const allMetrics: Record<string, any> = {};
      
      for (const [id, pipeline] of this.activePipelines) {
        allMetrics[id] = pipeline.getPipelineStats();
      }

      return new Response(
        JSON.stringify(allMetrics),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pipeline = this.activePipelines.get(jobId);
    if (!pipeline) {
      return new Response(
        JSON.stringify({ error: 'Pipeline not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(pipeline.getPipelineStats()),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get available data sources
   */
  private async getAvailableSources(): Promise<Response> {
    const sources = [
      {
        id: 'world-bank',
        name: 'World Bank Open Data',
        type: 'api',
        description: 'Energy indicators from World Bank',
        updateFrequency: 'Annual'
      },
      {
        id: 'nasa-power',
        name: 'NASA POWER',
        type: 'api',
        description: 'Climate and renewable energy resource data',
        updateFrequency: 'Daily'
      },
      {
        id: 'irena',
        name: 'IRENA Statistics',
        type: 'api',
        description: 'Renewable energy capacity and generation',
        updateFrequency: 'Annual'
      },
      {
        id: 'esmap-hub',
        name: 'ESMAP Data Hub',
        type: 'api',
        description: '908 energy datasets across 193 countries',
        updateFrequency: 'Varies'
      },
      {
        id: 'mtf-survey',
        name: 'Multi-Tier Framework Surveys',
        type: 'api',
        description: 'Energy access tier data from household surveys',
        updateFrequency: 'Periodic'
      }
    ];

    return new Response(
      JSON.stringify(sources),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Create pipeline configuration from job request
   */
  private async createPipelineConfig(jobRequest: ETLJobRequest): Promise<ETLPipelineConfig> {
    const sources: DataSource[] = [];

    // Map source IDs to actual data source configurations
    for (const sourceId of jobRequest.sources) {
      const sourceConfig = await this.getSourceConfig(sourceId);
      if (sourceConfig) {
        sources.push(sourceConfig);
      }
    }

    return {
      name: jobRequest.pipelineName,
      sources,
      transformations: [], // Will be loaded from transformation rules
      batchSize: jobRequest.options?.batchSize || 100,
      parallelism: jobRequest.options?.parallelism || 5,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 30000
      },
      errorHandling: {
        onValidationError: 'quarantine',
        onTransformError: 'skip',
        quarantineTable: 'etl_quarantine'
      }
    };
  }

  /**
   * Get source configuration
   */
  private async getSourceConfig(sourceId: string): Promise<DataSource | null> {
    // In production, these would be stored in D1 or KV
    const sourceConfigs: Record<string, DataSource> = {
      'world-bank': {
        id: 'world-bank',
        name: 'World Bank Open Data',
        type: 'api',
        priority: 1,
        config: {
          url: 'https://api.worldbank.org/v2/country/all/indicator',
          headers: {
            'Accept': 'application/json'
          },
          params: {
            format: 'json',
            per_page: '1000'
          }
        }
      },
      'nasa-power': {
        id: 'nasa-power',
        name: 'NASA POWER',
        type: 'api',
        priority: 2,
        config: {
          url: 'https://power.larc.nasa.gov/api/temporal/daily/point',
          headers: {
            'Accept': 'application/json'
          }
        }
      },
      'irena': {
        id: 'irena',
        name: 'IRENA Statistics',
        type: 'api',
        priority: 2,
        config: {
          url: 'https://www.irena.org/api/statistics',
          headers: {
            'Accept': 'application/json'
          }
        }
      }
    };

    return sourceConfigs[sourceId] || null;
  }

  /**
   * Process ETL job from queue
   */
  async processQueueMessage(message: any): Promise<void> {
    if (message.type !== 'etl-job') return;

    const { jobId, config } = message;
    const pipeline = this.activePipelines.get(jobId);

    if (!pipeline) {
      console.error(`Pipeline not found for job ${jobId}`);
      return;
    }

    try {
      // Update job status to running
      await this.env.ETL_CACHE.put(
        `job:${jobId}`,
        JSON.stringify({
          status: 'running',
          startTime: new Date().toISOString()
        }),
        { expirationTtl: 86400 }
      );

      // Execute pipeline
      const metrics = await pipeline.execute();

      // Update job status to completed
      await this.env.ETL_CACHE.put(
        `job:${jobId}`,
        JSON.stringify({
          status: 'completed',
          completedTime: new Date().toISOString(),
          metrics
        }),
        { expirationTtl: 86400 }
      );

      // Clean up
      pipeline.clearPipelineData();
      this.activePipelines.delete(jobId);

    } catch (error) {
      console.error(`ETL job ${jobId} failed:`, error);
      
      // Update job status to failed
      await this.env.ETL_CACHE.put(
        `job:${jobId}`,
        JSON.stringify({
          status: 'failed',
          failedTime: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { expirationTtl: 86400 }
      );

      // Clean up
      if (pipeline) {
        pipeline.clearPipelineData();
        this.activePipelines.delete(jobId);
      }
    }
  }
}

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: ETLWorkerEnv): Promise<Response> {
    const worker = new ETLWorker(env);
    return worker.handleRequest(request);
  },

  async queue(batch: MessageBatch, env: ETLWorkerEnv): Promise<void> {
    const worker = new ETLWorker(env);
    
    for (const message of batch.messages) {
      await worker.processQueueMessage(message.body);
      message.ack();
    }
  }
};