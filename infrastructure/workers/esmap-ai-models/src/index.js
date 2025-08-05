/**
 * ESMAP AI Models Worker
 * Deploys and manages Hugging Face models via Cloudflare Workers AI
 */

import { ModelManager } from './models/model-manager.js';
import { InferenceEngine } from './inference/inference-engine.js';
import { ErrorHandler } from './utils/error-handler.js';
import { PerformanceMonitor } from './utils/performance-monitor.js';
import { CacheManager } from './utils/cache-manager.js';

export default {
  async fetch(request, env, ctx) {
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.start('total_request');

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      };

      // Handle OPTIONS
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Initialize managers
      const modelManager = new ModelManager(env);
      const inferenceEngine = new InferenceEngine(env, modelManager);
      const cacheManager = new CacheManager(env.INFERENCE_CACHE);
      const errorHandler = new ErrorHandler();

      // Route handlers
      switch (true) {
        case path === '/':
          return new Response(JSON.stringify({
            service: 'ESMAP AI Models',
            version: '1.0.0',
            status: 'operational',
            endpoints: {
              '/models': 'List available models',
              '/models/{modelId}': 'Get model details',
              '/inference': 'Run model inference',
              '/inference/batch': 'Batch inference',
              '/health': 'Health check',
              '/metrics': 'Performance metrics'
            }
          }), { headers: corsHeaders });

        case path === '/health':
          const health = await this.checkHealth(env, modelManager);
          return new Response(JSON.stringify(health), { headers: corsHeaders });

        case path === '/models':
          const models = await modelManager.listAvailableModels();
          return new Response(JSON.stringify({
            success: true,
            models,
            count: models.length
          }), { headers: corsHeaders });

        case path.startsWith('/models/'):
          const modelId = path.split('/')[2];
          const modelDetails = await modelManager.getModelDetails(modelId);
          if (!modelDetails) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Model not found'
            }), { status: 404, headers: corsHeaders });
          }
          return new Response(JSON.stringify({
            success: true,
            model: modelDetails
          }), { headers: corsHeaders });

        case path === '/inference':
          if (request.method !== 'POST') {
            return new Response(JSON.stringify({
              success: false,
              error: 'Method not allowed'
            }), { status: 405, headers: corsHeaders });
          }

          const inferenceData = await request.json();
          
          // Check cache first
          const cacheKey = cacheManager.generateKey(inferenceData);
          const cachedResult = await cacheManager.get(cacheKey);
          if (cachedResult) {
            perfMonitor.end('total_request');
            return new Response(JSON.stringify({
              success: true,
              result: cachedResult,
              cached: true,
              performance: perfMonitor.getMetrics()
            }), { headers: corsHeaders });
          }

          // Run inference
          perfMonitor.start('inference');
          const result = await inferenceEngine.runInference(inferenceData);
          perfMonitor.end('inference');

          // Cache result
          await cacheManager.set(cacheKey, result, env.MODEL_CACHE_TTL);

          perfMonitor.end('total_request');
          return new Response(JSON.stringify({
            success: true,
            result,
            cached: false,
            performance: perfMonitor.getMetrics()
          }), { headers: corsHeaders });

        case path === '/inference/batch':
          if (request.method !== 'POST') {
            return new Response(JSON.stringify({
              success: false,
              error: 'Method not allowed'
            }), { status: 405, headers: corsHeaders });
          }

          const batchData = await request.json();
          const batchResults = await inferenceEngine.runBatchInference(batchData);
          
          perfMonitor.end('total_request');
          return new Response(JSON.stringify({
            success: true,
            results: batchResults,
            performance: perfMonitor.getMetrics()
          }), { headers: corsHeaders });

        case path === '/metrics':
          const metrics = await this.getMetrics(env);
          return new Response(JSON.stringify(metrics), { headers: corsHeaders });

        default:
          return new Response(JSON.stringify({
            success: false,
            error: 'Endpoint not found'
          }), { status: 404, headers: corsHeaders });
      }

    } catch (error) {
      console.error('Worker error:', error);
      const errorHandler = new ErrorHandler();
      const errorResponse = errorHandler.handleError(error);
      
      return new Response(JSON.stringify({
        success: false,
        error: errorResponse.message,
        details: errorResponse.details
      }), { 
        status: errorResponse.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  },

  async checkHealth(env, modelManager) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check AI binding
      health.checks.ai_binding = {
        status: env.AI ? 'operational' : 'unavailable',
        message: env.AI ? 'AI binding available' : 'AI binding not configured'
      };

      // Check available models
      const models = await modelManager.listAvailableModels();
      health.checks.models = {
        status: models.length > 0 ? 'operational' : 'degraded',
        available: models.length,
        message: `${models.length} models available`
      };

      // Check database
      if (env.DB) {
        try {
          const result = await env.DB.prepare('SELECT 1').first();
          health.checks.database = {
            status: 'operational',
            message: 'Database connection successful'
          };
        } catch (error) {
          health.checks.database = {
            status: 'degraded',
            message: 'Database connection failed',
            error: error.message
          };
          health.status = 'degraded';
        }
      }

      // Check cache
      if (env.INFERENCE_CACHE) {
        health.checks.cache = {
          status: 'operational',
          message: 'Cache available'
        };
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  },

  async getMetrics(env) {
    const metrics = {
      timestamp: new Date().toISOString(),
      inference: {
        total_requests: 0,
        cached_requests: 0,
        average_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0
      },
      models: {
        active: 0,
        total_invocations: 0
      },
      errors: {
        total: 0,
        rate: 0
      }
    };

    // TODO: Implement actual metrics collection from D1/Analytics
    
    return metrics;
  }
};