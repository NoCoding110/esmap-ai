/**
 * AI Models Route Handler
 * Integrates with the AI models service for inference
 */

import { Context } from '../types';

const AI_MODELS_URL = 'https://esmap-ai-models.metabilityllc1.workers.dev';

export async function handleAIModelsRoute(
  request: Request,
  env: any,
  ctx: Context,
  segments: string[]
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // segments: ['api', 'v1', 'ai', ...]
    const endpoint = segments.slice(3).join('/');
    
    switch (endpoint) {
      case '':
      case 'models':
        return await getAvailableModels();
      
      case 'inference':
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }), { status: 405, headers: corsHeaders });
        }
        return await runInference(request);
      
      case 'analyze-text':
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }), { status: 405, headers: corsHeaders });
        }
        return await analyzeEnergyText(request);
      
      case 'forecast':
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
          }), { status: 405, headers: corsHeaders });
        }
        return await forecastRenewable(request);
      
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Endpoint not found',
          available: ['/ai/models', '/ai/inference', '/ai/analyze-text', '/ai/forecast']
        }), { status: 404, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('AI route error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), { status: 500, headers: corsHeaders });
  }
}

async function getAvailableModels(): Promise<Response> {
  try {
    const response = await fetch(`${AI_MODELS_URL}/models`);
    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      models: data.models,
      endpoints: {
        inference: '/api/v1/ai/inference',
        analyzeText: '/api/v1/ai/analyze-text',
        forecast: '/api/v1/ai/forecast'
      }
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    throw new Error('Failed to fetch available models');
  }
}

async function runInference(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    
    // Forward to AI models service
    const response = await fetch(`${AI_MODELS_URL}/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    throw new Error('Inference request failed');
  }
}

async function analyzeEnergyText(request: Request): Promise<Response> {
  try {
    const { text, analysis_type = 'comprehensive' } = await request.json();
    
    if (!text) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Text is required'
      }), { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const analyses: any[] = [];

    // 1. Climate classification
    const classificationResponse = await fetch(`${AI_MODELS_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'climate-bert',
        input: { text }
      })
    });
    const classification = await classificationResponse.json();
    analyses.push({
      type: 'classification',
      result: classification.result
    });

    // 2. Entity extraction
    const nerResponse = await fetch(`${AI_MODELS_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'energy-ner',
        input: { text }
      })
    });
    const entities = await nerResponse.json();
    analyses.push({
      type: 'entities',
      result: entities.result
    });

    // 3. Summary (if text is long)
    if (text.length > 500) {
      const summaryResponse = await fetch(`${AI_MODELS_URL}/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: 'energy-summarizer',
          input: { text, maxLength: 100 }
        })
      });
      const summary = await summaryResponse.json();
      analyses.push({
        type: 'summary',
        result: summary.result
      });
    }

    return new Response(JSON.stringify({
      success: true,
      text_length: text.length,
      analyses,
      recommendations: generateRecommendations(analyses)
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    throw new Error('Text analysis failed');
  }
}

async function forecastRenewable(request: Request): Promise<Response> {
  try {
    const { 
      type = 'solar',
      location,
      historical_data,
      weather_data 
    } = await request.json();

    // Prepare features for forecasting
    const features = {
      temperature: weather_data?.temperature || 25,
      windSpeed: weather_data?.windSpeed || 10,
      cloudCover: weather_data?.cloudCover || 30,
      historicalGeneration: historical_data || [100, 95, 98, 102]
    };

    // Run forecast
    const response = await fetch(`${AI_MODELS_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'renewable-forecast',
        input: { features }
      })
    });

    const forecast = await response.json();

    return new Response(JSON.stringify({
      success: true,
      type,
      location,
      forecast: forecast.result,
      metadata: {
        model: 'renewable-forecast',
        timestamp: new Date().toISOString(),
        input_features: features
      }
    }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    throw new Error('Renewable forecast failed');
  }
}

function generateRecommendations(analyses: any[]): string[] {
  const recommendations: string[] = [];

  // Check classification results
  const classification = analyses.find(a => a.type === 'classification');
  if (classification?.result?.label === 'POSITIVE') {
    recommendations.push('Content shows positive sentiment towards energy transition');
  }

  // Check entities
  const entities = analyses.find(a => a.type === 'entities');
  if (entities?.result?.entities?.length > 0) {
    const orgs = entities.result.entities.filter((e: any) => e.type === 'ORG');
    if (orgs.length > 0) {
      recommendations.push(`Key organizations identified: ${orgs.map((o: any) => o.text).join(', ')}`);
    }
  }

  return recommendations;
}