import type { Env, HealthCheckResponse } from '../types';
import { Logger } from '../utils/logger';
import { createSuccessResponse } from '../utils/error-handler';

const startTime = Date.now();

export async function handleHealthCheck(env: Env, logger: Logger): Promise<Response> {
  logger.info('Health check requested');
  
  const services: HealthCheckResponse['services'] = {
    database: 'disconnected',
    storage: 'disconnected',
    ai: 'disconnected',
    cache: 'disconnected'
  };
  
  try {
    // Test database connection
    if (env.DB) {
      await env.DB.prepare('SELECT 1').first();
      services.database = 'connected';
    }
  } catch (e) {
    logger.warn('Database connection failed', { error: e });
  }
  
  try {
    // Test R2 storage connection
    if (env.DATA_BUCKET) {
      await env.DATA_BUCKET.head('health-check');
      services.storage = 'connected';
    }
  } catch (e) {
    logger.warn('Storage connection failed', { error: e });
  }
  
  try {
    // Test AI binding
    if (env.AI) {
      services.ai = 'connected';
    }
  } catch (e) {
    logger.warn('AI binding failed', { error: e });
  }
  
  try {
    // Test KV cache
    if (env.CACHE) {
      await env.CACHE.get('health-check');
      services.cache = 'connected';
    }
  } catch (e) {
    logger.warn('Cache connection failed', { error: e });
  }
  
  const connectedServices = Object.values(services).filter(status => status === 'connected').length;
  const totalServices = Object.keys(services).length;
  
  let status: HealthCheckResponse['status'] = 'healthy';
  if (connectedServices === 0) {
    status = 'unhealthy';
  } else if (connectedServices < totalServices) {
    status = 'degraded';
  }
  
  const healthData: HealthCheckResponse = {
    status,
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    services,
    uptime: Date.now() - startTime
  };
  
  logger.info('Health check completed', { status, connectedServices, totalServices });
  
  const response = createSuccessResponse(healthData, logger.getRequestId());
  return Response.json(response, { 
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}