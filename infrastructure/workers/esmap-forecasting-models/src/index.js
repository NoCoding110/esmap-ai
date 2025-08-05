/**
 * ESMAP Custom Energy Forecasting Models
 * Advanced time series forecasting for energy demand/supply
 */

import { ForecastingEngine } from './forecasting/forecasting-engine.js';
import { ModelTrainer } from './training/model-trainer.js';
import { ValidationFramework } from './validation/validation-framework.js';
import { ABTestManager } from './testing/ab-test-manager.js';
import { DataProcessor } from './data/data-processor.js';
import { ErrorHandler } from './utils/error-handler.js';
import { PerformanceMonitor } from './utils/performance-monitor.js';
import { TrainingSession } from './training/training-session.js';

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

      // Initialize services
      const forecastingEngine = new ForecastingEngine(env);
      const modelTrainer = new ModelTrainer(env);
      const validationFramework = new ValidationFramework(env);
      const abTestManager = new ABTestManager(env);
      const dataProcessor = new DataProcessor(env);
      const errorHandler = new ErrorHandler();

      // Route handlers
      switch (true) {
        case path === '/':
          return new Response(JSON.stringify({
            service: 'ESMAP Energy Forecasting Models',
            version: '1.0.0',
            status: 'operational',
            capabilities: [
              'Energy demand forecasting',
              'Renewable generation forecasting', 
              'Grid load prediction',
              'Cross-country validation',
              'A/B model testing',
              'Real-time model updates'
            ],
            endpoints: {
              '/forecast': 'Generate energy forecasts',
              '/forecast/demand': 'Energy demand forecasting',
              '/forecast/supply': 'Energy supply forecasting',
              '/forecast/renewable': 'Renewable generation forecasting',
              '/models': 'List available forecasting models',
              '/models/train': 'Train new forecasting models',
              '/models/validate': 'Cross-validate models',
              '/models/compare': 'A/B test model performance',
              '/data/upload': 'Upload historical energy data',
              '/health': 'Health check and model status',
              '/metrics': 'Performance and accuracy metrics'
            }
          }), { headers: corsHeaders });

        case path === '/health':
          const health = await this.checkHealth(env, forecastingEngine);
          return new Response(JSON.stringify(health), { headers: corsHeaders });

        case path === '/models':
          if (request.method === 'GET') {
            const models = await forecastingEngine.listModels();
            return new Response(JSON.stringify({
              success: true,
              models,
              count: models.length
            }), { headers: corsHeaders });
          }
          break;

        case path === '/models/train':
          if (request.method === 'POST') {
            const trainingRequest = await request.json();
            perfMonitor.start('model_training');
            
            const trainingResult = await modelTrainer.trainModel(trainingRequest);
            perfMonitor.end('model_training');
            
            return new Response(JSON.stringify({
              success: true,
              training_result: trainingResult,
              performance: perfMonitor.getMetrics()
            }), { headers: corsHeaders });
          }
          break;

        case path === '/models/validate':
          if (request.method === 'POST') {
            const validationRequest = await request.json();
            perfMonitor.start('cross_validation');
            
            const validationResult = await validationFramework.crossValidate(validationRequest);
            perfMonitor.end('cross_validation');
            
            return new Response(JSON.stringify({
              success: true,
              validation_result: validationResult,
              performance: perfMonitor.getMetrics()
            }), { headers: corsHeaders });
          }
          break;

        case path === '/models/compare':
          if (request.method === 'POST') {
            const comparisonRequest = await request.json();
            const comparisonResult = await abTestManager.compareModels(comparisonRequest);
            
            return new Response(JSON.stringify({
              success: true,
              comparison_result: comparisonResult
            }), { headers: corsHeaders });
          }
          break;

        case path === '/forecast':
          if (request.method === 'POST') {
            const forecastRequest = await request.json();
            perfMonitor.start('forecasting');
            
            const forecast = await forecastingEngine.generateForecast(forecastRequest);
            perfMonitor.end('forecasting');
            
            return new Response(JSON.stringify({
              success: true,
              forecast,
              performance: perfMonitor.getMetrics()
            }), { headers: corsHeaders });
          }
          break;

        case path === '/forecast/demand':
          if (request.method === 'POST') {
            const demandRequest = await request.json();
            const demandForecast = await forecastingEngine.forecastDemand(demandRequest);
            
            return new Response(JSON.stringify({
              success: true,
              forecast: demandForecast,
              type: 'demand'
            }), { headers: corsHeaders });
          }
          break;

        case path === '/forecast/supply':
          if (request.method === 'POST') {
            const supplyRequest = await request.json();
            const supplyForecast = await forecastingEngine.forecastSupply(supplyRequest);
            
            return new Response(JSON.stringify({
              success: true,
              forecast: supplyForecast,
              type: 'supply'
            }), { headers: corsHeaders });
          }
          break;

        case path === '/forecast/renewable':
          if (request.method === 'POST') {
            const renewableRequest = await request.json();
            const renewableForecast = await forecastingEngine.forecastRenewable(renewableRequest);
            
            return new Response(JSON.stringify({
              success: true,
              forecast: renewableForecast,
              type: 'renewable'
            }), { headers: corsHeaders });
          }
          break;

        case path === '/data/upload':
          if (request.method === 'POST') {
            const uploadData = await request.json();
            const processedData = await dataProcessor.processHistoricalData(uploadData);
            
            return new Response(JSON.stringify({
              success: true,
              processed_data: processedData
            }), { headers: corsHeaders });
          }
          break;

        case path === '/metrics':
          const metrics = await this.getMetrics(env, forecastingEngine);
          return new Response(JSON.stringify(metrics), { headers: corsHeaders });

        default:
          return new Response(JSON.stringify({
            success: false,
            error: 'Endpoint not found'
          }), { status: 404, headers: corsHeaders });
      }

      // Default method not allowed response
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), { status: 405, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      const errorHandler = new ErrorHandler();
      const errorResponse = errorHandler.handleError(error);
      
      perfMonitor.end('total_request');
      
      return new Response(JSON.stringify({
        success: false,
        error: errorResponse.message,
        details: errorResponse.details,
        performance: perfMonitor.getMetrics()
      }), { 
        status: errorResponse.status || 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  },

  async checkHealth(env, forecastingEngine) {
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

      // Check database
      if (env.DB) {
        try {
          const result = await env.DB.prepare('SELECT COUNT(*) as count FROM models').first();
          health.checks.database = {
            status: 'operational',
            models_count: result?.count || 0,
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

      // Check model storage
      if (env.MODEL_STORAGE) {
        health.checks.model_storage = {
          status: 'operational',
          message: 'R2 model storage available'
        };
      }

      // Check forecasting engine
      const models = await forecastingEngine.listModels();
      health.checks.forecasting = {
        status: models.length > 0 ? 'operational' : 'degraded',
        available_models: models.length,
        message: `${models.length} forecasting models available`
      };

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  },

  async getMetrics(env, forecastingEngine) {
    const metrics = {
      timestamp: new Date().toISOString(),
      forecasting: {
        total_forecasts: 0,
        average_accuracy: 0,
        average_mape: 0,
        models_deployed: 0
      },
      training: {
        models_trained: 0,
        average_training_time: 0,
        last_training: null
      },
      validation: {
        cross_validation_runs: 0,
        average_cv_score: 0,
        countries_validated: 0
      },
      ab_testing: {
        active_tests: 0,
        completed_tests: 0,
        winning_models: []
      }
    };

    try {
      if (env.DB) {
        // Get forecasting metrics
        const forecastMetrics = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_forecasts,
            AVG(accuracy) as avg_accuracy,
            AVG(mape) as avg_mape
          FROM forecast_history 
          WHERE created_at > datetime('now', '-30 days')
        `).first();

        if (forecastMetrics) {
          metrics.forecasting.total_forecasts = forecastMetrics.total_forecasts || 0;
          metrics.forecasting.average_accuracy = forecastMetrics.avg_accuracy || 0;
          metrics.forecasting.average_mape = forecastMetrics.avg_mape || 0;
        }

        // Get model count
        const modelCount = await env.DB.prepare('SELECT COUNT(*) as count FROM models WHERE status = "active"').first();
        metrics.forecasting.models_deployed = modelCount?.count || 0;

        // Get training metrics
        const trainingMetrics = await env.DB.prepare(`
          SELECT 
            COUNT(*) as models_trained,
            AVG(training_time_ms) as avg_training_time,
            MAX(created_at) as last_training
          FROM model_training_history
          WHERE created_at > datetime('now', '-30 days')
        `).first();

        if (trainingMetrics) {
          metrics.training.models_trained = trainingMetrics.models_trained || 0;
          metrics.training.average_training_time = trainingMetrics.avg_training_time || 0;
          metrics.training.last_training = trainingMetrics.last_training;
        }
      }
    } catch (error) {
      console.error('Error getting metrics:', error);
    }

    return metrics;
  }
};

// Export Durable Object classes
export { TrainingSession };