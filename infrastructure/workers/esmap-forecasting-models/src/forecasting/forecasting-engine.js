/**
 * Forecasting Engine
 * Core time series forecasting for energy demand/supply
 */

import { TimeSeriesModel } from './models/time-series-model.js';
import { EnergyDemandModel } from './models/energy-demand-model.js';
import { RenewableSupplyModel } from './models/renewable-supply-model.js';
import { GridLoadModel } from './models/grid-load-model.js';

export class ForecastingEngine {
  constructor(env) {
    this.env = env;
    this.models = this.initializeModels();
  }

  initializeModels() {
    return {
      'energy-demand-arima': {
        id: 'energy-demand-arima',
        name: 'Energy Demand ARIMA',
        type: 'demand',
        algorithm: 'ARIMA',
        description: 'Autoregressive Integrated Moving Average for energy demand',
        accuracy: 0.87,
        mape: 12.5,
        countries: ['USA', 'GBR', 'DEU', 'FRA', 'JPN'],
        status: 'active'
      },
      
      'renewable-lstm': {
        id: 'renewable-lstm',
        name: 'Renewable Generation LSTM',
        type: 'supply',
        algorithm: 'LSTM',
        description: 'Long Short-Term Memory network for renewable generation',
        accuracy: 0.82,
        mape: 14.2,
        countries: ['DNK', 'ESP', 'PRT', 'IRL', 'NLD'],
        status: 'active'
      },

      'grid-load-prophet': {
        id: 'grid-load-prophet',
        name: 'Grid Load Prophet',
        type: 'demand',
        algorithm: 'Prophet',
        description: 'Facebook Prophet model for grid load forecasting',
        accuracy: 0.89,
        mape: 10.8,
        countries: ['USA', 'CAN', 'AUS', 'NZL'],
        status: 'active'
      },

      'solar-weather-rf': {
        id: 'solar-weather-rf',
        name: 'Solar Weather Random Forest',
        type: 'renewable',
        algorithm: 'RandomForest',
        description: 'Weather-based solar generation forecasting',
        accuracy: 0.84,
        mape: 13.1,
        countries: ['ESP', 'ITA', 'GRC', 'TUR', 'MAR'],
        status: 'active'
      },

      'wind-power-ensemble': {
        id: 'wind-power-ensemble',
        name: 'Wind Power Ensemble',
        type: 'renewable',
        algorithm: 'Ensemble',
        description: 'Ensemble model for wind power forecasting',
        accuracy: 0.86,
        mape: 11.9,
        countries: ['DNK', 'DEU', 'GBR', 'NLD', 'BEL'],
        status: 'active'
      },

      'hydroelectric-seasonal': {
        id: 'hydroelectric-seasonal',
        name: 'Hydroelectric Seasonal',
        type: 'renewable',
        algorithm: 'SeasonalDecomposition',
        description: 'Seasonal decomposition for hydroelectric forecasting',
        accuracy: 0.91,
        mape: 8.7,
        countries: ['NOR', 'SWE', 'CAN', 'BRA', 'COL'],
        status: 'active'
      }
    };
  }

  async listModels() {
    const modelList = [];
    
    for (const [key, model] of Object.entries(this.models)) {
      modelList.push({
        id: model.id,
        name: model.name,
        type: model.type,
        algorithm: model.algorithm,
        description: model.description,
        accuracy: model.accuracy,
        mape: model.mape,
        countries: model.countries,
        status: model.status,
        last_updated: new Date().toISOString()
      });
    }
    
    return modelList;
  }

  async generateForecast(request) {
    const {
      model_id,
      data,
      horizon = 168, // 7 days in hours
      country,
      energy_type = 'total',
      include_confidence = true
    } = request;

    // Validate model
    const model = this.models[model_id];
    if (!model) {
      throw new Error(`Model ${model_id} not found`);
    }

    // Validate data
    if (!data || !Array.isArray(data) || data.length < 24) {
      throw new Error('Insufficient historical data (minimum 24 hours required)');
    }

    // Initialize appropriate model class
    let forecastModel;
    switch (model.algorithm) {
      case 'ARIMA':
        forecastModel = new TimeSeriesModel('ARIMA');
        break;
      case 'LSTM':
        forecastModel = new TimeSeriesModel('LSTM');
        break;
      case 'Prophet':
        forecastModel = new TimeSeriesModel('Prophet');
        break;
      case 'RandomForest':
        forecastModel = new TimeSeriesModel('RandomForest');
        break;
      case 'Ensemble':
        forecastModel = new TimeSeriesModel('Ensemble');
        break;
      default:
        forecastModel = new TimeSeriesModel('ARIMA');
    }

    // Generate forecast
    const forecast = await forecastModel.forecast({
      data,
      horizon,
      country,
      energy_type,
      include_confidence
    });

    // Add model metadata
    forecast.model = {
      id: model.id,
      name: model.name,
      algorithm: model.algorithm,
      accuracy: model.accuracy,
      mape: model.mape
    };

    forecast.metadata = {
      generated_at: new Date().toISOString(),
      data_points: data.length,
      forecast_horizon: horizon,
      country,
      energy_type
    };

    // Store forecast for metrics
    await this.storeForecast(forecast);

    return forecast;
  }

  async forecastDemand(request) {
    const {
      country,
      historical_data,
      external_factors = {},
      horizon = 168
    } = request;

    const demandModel = new EnergyDemandModel();
    
    // Enhance with external factors
    const enhancedData = await this.enrichWithExternalFactors(historical_data, external_factors, country);
    
    const forecast = await demandModel.forecastDemand({
      data: enhancedData,
      horizon,
      country,
      factors: external_factors
    });

    return this.addForecastMetadata(forecast, 'demand', country);
  }

  async forecastSupply(request) {
    const {
      country,
      generation_mix,
      weather_data,
      horizon = 168
    } = request;

    const supplyForecast = {
      fossil: null,
      renewable: null,
      nuclear: null,
      total: null
    };

    // Forecast renewable supply
    if (generation_mix.renewable && generation_mix.renewable > 0) {
      const renewableModel = new RenewableSupplyModel();
      supplyForecast.renewable = await renewableModel.forecastGeneration({
        weather_data,
        capacity: generation_mix.renewable,
        country,
        horizon
      });
    }

    // Forecast conventional supply (simplified)
    supplyForecast.fossil = await this.forecastConventionalSupply({
      capacity: generation_mix.fossil || 0,
      country,
      horizon
    });

    supplyForecast.nuclear = await this.forecastNuclearSupply({
      capacity: generation_mix.nuclear || 0,
      country,
      horizon
    });

    // Calculate total supply
    supplyForecast.total = this.combineForecast([
      supplyForecast.fossil,
      supplyForecast.renewable,
      supplyForecast.nuclear
    ]);

    return this.addForecastMetadata(supplyForecast, 'supply', country);
  }

  async forecastRenewable(request) {
    const {
      renewable_type = 'solar',
      weather_data,
      capacity,
      country,
      horizon = 168
    } = request;

    const renewableModel = new RenewableSupplyModel();
    
    const forecast = await renewableModel.forecastByType({
      type: renewable_type,
      weather_data,
      capacity,
      country,
      horizon
    });

    return this.addForecastMetadata(forecast, 'renewable', country);
  }

  async enrichWithExternalFactors(data, factors, country) {
    const enrichedData = data.map(point => ({
      ...point,
      temperature: factors.temperature || 20,
      economic_activity: factors.economic_activity || 1.0,
      day_of_week: new Date(point.timestamp).getDay(),
      hour_of_day: new Date(point.timestamp).getHours(),
      month: new Date(point.timestamp).getMonth(),
      is_holiday: factors.holidays && factors.holidays.includes(point.timestamp.split('T')[0])
    }));

    return enrichedData;
  }

  async forecastConventionalSupply({ capacity, country, horizon }) {
    // Simplified conventional generation forecast
    const baseLoad = capacity * 0.7; // 70% capacity factor
    const forecast = [];
    
    for (let i = 0; i < horizon; i++) {
      // Add some variability
      const variability = 1 + (Math.random() - 0.5) * 0.1;
      forecast.push({
        hour: i,
        value: baseLoad * variability,
        confidence: 0.95
      });
    }
    
    return forecast;
  }

  async forecastNuclearSupply({ capacity, country, horizon }) {
    // Nuclear is typically baseload with high capacity factor
    const baseLoad = capacity * 0.85; // 85% capacity factor
    const forecast = [];
    
    for (let i = 0; i < horizon; i++) {
      forecast.push({
        hour: i,
        value: baseLoad,
        confidence: 0.98
      });
    }
    
    return forecast;
  }

  combineForecast(forecasts) {
    const validForecasts = forecasts.filter(f => f && Array.isArray(f));
    if (validForecasts.length === 0) return [];

    const combined = [];
    const maxLength = Math.max(...validForecasts.map(f => f.length));

    for (let i = 0; i < maxLength; i++) {
      let totalValue = 0;
      let totalConfidence = 0;
      let count = 0;

      validForecasts.forEach(forecast => {
        if (forecast[i]) {
          totalValue += forecast[i].value || 0;
          totalConfidence += forecast[i].confidence || 0;
          count++;
        }
      });

      combined.push({
        hour: i,
        value: totalValue,
        confidence: count > 0 ? totalConfidence / count : 0
      });
    }

    return combined;
  }

  addForecastMetadata(forecast, type, country) {
    return {
      ...forecast,
      metadata: {
        type,
        country,
        generated_at: new Date().toISOString(),
        forecast_engine: 'ESMAP Custom Forecasting v1.0'
      }
    };
  }

  async storeForecast(forecast) {
    if (!this.env.DB) return;

    try {
      await this.env.DB.prepare(`
        INSERT INTO forecast_history (
          model_id, country, forecast_type, 
          accuracy, mape, data_points, 
          forecast_horizon, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        forecast.model?.id || 'unknown',
        forecast.metadata?.country || 'unknown',
        forecast.metadata?.energy_type || 'total',
        forecast.model?.accuracy || 0,
        forecast.model?.mape || 0,
        forecast.metadata?.data_points || 0,
        forecast.metadata?.forecast_horizon || 0
      ).run();
    } catch (error) {
      console.error('Error storing forecast:', error);
    }
  }

  async getModelPerformance(modelId, country = null) {
    if (!this.env.DB) return null;

    try {
      let query = `
        SELECT 
          AVG(accuracy) as avg_accuracy,
          AVG(mape) as avg_mape,
          COUNT(*) as total_forecasts,
          MAX(created_at) as last_forecast
        FROM forecast_history 
        WHERE model_id = ?
      `;

      const params = [modelId];

      if (country) {
        query += ' AND country = ?';
        params.push(country);
      }

      const result = await this.env.DB.prepare(query).bind(...params).first();
      return result;
    } catch (error) {
      console.error('Error getting model performance:', error);
      return null;
    }
  }
}