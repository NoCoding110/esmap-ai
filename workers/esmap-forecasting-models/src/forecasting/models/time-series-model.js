/**
 * Time Series Model
 * Core time series forecasting algorithms
 */

export class TimeSeriesModel {
  constructor(algorithm = 'ARIMA') {
    this.algorithm = algorithm;
    this.trained = false;
    this.parameters = {};
  }

  async forecast({ data, horizon, country, energy_type, include_confidence = true }) {
    // Validate input data
    this.validateData(data);

    // Preprocess data
    const processedData = this.preprocessData(data);

    // Generate forecast based on algorithm
    let forecast;
    switch (this.algorithm) {
      case 'ARIMA':
        forecast = await this.arimaForecast(processedData, horizon);
        break;
      case 'LSTM':
        forecast = await this.lstmForecast(processedData, horizon);
        break;
      case 'Prophet':
        forecast = await this.prophetForecast(processedData, horizon);
        break;
      case 'RandomForest':
        forecast = await this.randomForestForecast(processedData, horizon);
        break;
      case 'Ensemble':
        forecast = await this.ensembleForecast(processedData, horizon);
        break;
      default:
        forecast = await this.arimaForecast(processedData, horizon);
    }

    // Add confidence intervals if requested
    if (include_confidence) {
      forecast = this.addConfidenceIntervals(forecast, processedData);
    }

    // Calculate accuracy metrics
    const metrics = this.calculateMetrics(forecast, processedData);

    return {
      algorithm: this.algorithm,
      forecast: forecast,
      metrics: metrics,
      parameters: this.parameters,
      data_quality: this.assessDataQuality(processedData)
    };
  }

  validateData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (data.length < 24) {
      throw new Error('Minimum 24 hours of historical data required');
    }

    // Check for required fields
    const requiredFields = ['timestamp', 'value'];
    const firstPoint = data[0];
    
    for (const field of requiredFields) {
      if (!(field in firstPoint)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check for data consistency
    const hasNullValues = data.some(point => 
      point.value === null || point.value === undefined || isNaN(point.value)
    );

    if (hasNullValues) {
      console.warn('Data contains null values - will be interpolated');
    }
  }

  preprocessData(data) {
    // Sort by timestamp
    const sorted = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Handle missing values with linear interpolation
    const cleaned = this.interpolateMissingValues(sorted);

    // Extract features
    const processed = cleaned.map((point, index) => {
      const date = new Date(point.timestamp);
      return {
        ...point,
        index,
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        quarter: Math.floor(date.getMonth() / 3),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        lag1: index > 0 ? cleaned[index - 1].value : point.value,
        lag24: index >= 24 ? cleaned[index - 24].value : point.value,
        lag168: index >= 168 ? cleaned[index - 168].value : point.value,
        movingAvg24: this.calculateMovingAverage(cleaned, index, 24),
        movingAvg168: this.calculateMovingAverage(cleaned, index, 168)
      };
    });

    return processed;
  }

  interpolateMissingValues(data) {
    const result = [...data];
    
    for (let i = 0; i < result.length; i++) {
      if (result[i].value === null || result[i].value === undefined || isNaN(result[i].value)) {
        // Find nearest non-null values
        let prevValue = null, nextValue = null;
        let prevIndex = i - 1, nextIndex = i + 1;
        
        // Find previous valid value
        while (prevIndex >= 0 && prevValue === null) {
          if (result[prevIndex].value !== null && !isNaN(result[prevIndex].value)) {
            prevValue = result[prevIndex].value;
          }
          prevIndex--;
        }
        
        // Find next valid value
        while (nextIndex < result.length && nextValue === null) {
          if (result[nextIndex].value !== null && !isNaN(result[nextIndex].value)) {
            nextValue = result[nextIndex].value;
          }
          nextIndex++;
        }
        
        // Interpolate
        if (prevValue !== null && nextValue !== null) {
          result[i].value = (prevValue + nextValue) / 2;
        } else if (prevValue !== null) {
          result[i].value = prevValue;
        } else if (nextValue !== null) {
          result[i].value = nextValue;
        } else {
          result[i].value = 0; // Fallback
        }
      }
    }
    
    return result;
  }

  calculateMovingAverage(data, currentIndex, window) {
    const start = Math.max(0, currentIndex - window + 1);
    const end = currentIndex + 1;
    const subset = data.slice(start, end);
    
    const sum = subset.reduce((total, point) => total + (point.value || 0), 0);
    return sum / subset.length;
  }

  async arimaForecast(data, horizon) {
    console.log('Generating ARIMA forecast...');
    
    // Extract values for ARIMA
    const values = data.map(point => point.value);
    
    // Simple ARIMA implementation (in production, use proper ARIMA library)
    const forecast = [];
    const lastValues = values.slice(-Math.min(24, values.length));
    const trend = this.calculateTrend(lastValues);
    const seasonality = this.calculateSeasonality(values, 24); // Daily seasonality
    
    for (let i = 0; i < horizon; i++) {
      const seasonalIndex = i % 24;
      const trendComponent = trend * i;
      const seasonalComponent = seasonality[seasonalIndex];
      const lastValue = lastValues[lastValues.length - 1];
      
      // Add some random walk component
      const randomWalk = (Math.random() - 0.5) * lastValue * 0.05;
      
      const forecastValue = lastValue + trendComponent + seasonalComponent + randomWalk;
      
      forecast.push({
        hour: i,
        timestamp: this.addHours(data[data.length - 1].timestamp, i + 1),
        value: Math.max(0, forecastValue), // Ensure non-negative
        method: 'ARIMA'
      });
    }
    
    this.parameters = {
      trend: trend,
      seasonality_period: 24,
      data_points: data.length
    };
    
    return forecast;
  }

  async lstmForecast(data, horizon) {
    console.log('Generating LSTM forecast...');
    
    // Simplified LSTM implementation
    const values = data.map(point => point.value);
    const sequenceLength = Math.min(168, values.length); // 1 week lookback
    
    const forecast = [];
    let currentSequence = values.slice(-sequenceLength);
    
    for (let i = 0; i < horizon; i++) {
      // Simplified LSTM prediction
      const weights = this.generateLSTMWeights(sequenceLength);
      let prediction = 0;
      
      for (let j = 0; j < currentSequence.length; j++) {
        prediction += currentSequence[j] * weights[j];
      }
      
      // Add trend and seasonality
      const trend = this.calculateTrend(currentSequence.slice(-24));
      const seasonal = this.getSeasonalComponent(values, i, 24);
      
      prediction = prediction + trend + seasonal;
      
      forecast.push({
        hour: i,
        timestamp: this.addHours(data[data.length - 1].timestamp, i + 1),
        value: Math.max(0, prediction),
        method: 'LSTM'
      });
      
      // Update sequence for next prediction
      currentSequence.shift();
      currentSequence.push(prediction);
    }
    
    this.parameters = {
      sequence_length: sequenceLength,
      weights_generated: weights.length
    };
    
    return forecast;
  }

  async prophetForecast(data, horizon) {
    console.log('Generating Prophet forecast...');
    
    // Simplified Prophet-like implementation
    const values = data.map(point => point.value);
    const timestamps = data.map(point => new Date(point.timestamp));
    
    // Decompose time series
    const trend = this.extractTrend(values);
    const seasonal = this.extractSeasonality(values, timestamps);
    const residuals = this.calculateResiduals(values, trend, seasonal);
    
    const forecast = [];
    
    for (let i = 0; i < horizon; i++) {
      const futureTimestamp = this.addHours(data[data.length - 1].timestamp, i + 1);
      const futureDate = new Date(futureTimestamp);
      
      // Project trend
      const trendValue = this.projectTrend(trend, i);
      
      // Get seasonal component
      const seasonalValue = this.getSeasonalValue(futureDate);
      
      // Add noise based on residuals
      const noise = this.sampleResiduals(residuals);
      
      const prediction = trendValue + seasonalValue + noise;
      
      forecast.push({
        hour: i,
        timestamp: futureTimestamp,
        value: Math.max(0, prediction),
        method: 'Prophet',
        components: {
          trend: trendValue,
          seasonal: seasonalValue,
          noise: noise
        }
      });
    }
    
    this.parameters = {
      trend_points: trend.length,
      seasonal_periods: [24, 168], // Daily and weekly
      residual_std: this.calculateStandardDeviation(residuals)
    };
    
    return forecast;
  }

  async randomForestForecast(data, horizon) {
    console.log('Generating Random Forest forecast...');
    
    // Prepare features for Random Forest
    const features = data.map(point => [
      point.hour,
      point.dayOfWeek,
      point.month,
      point.isWeekend ? 1 : 0,
      point.lag1,
      point.lag24,
      point.lag168,
      point.movingAvg24,
      point.movingAvg168
    ]);
    
    const targets = data.map(point => point.value);
    
    // Train simplified Random Forest (in production, use proper RF library)
    const trees = this.trainRandomForestTrees(features, targets, 10);
    
    const forecast = [];
    let lastData = data[data.length - 1];
    
    for (let i = 0; i < horizon; i++) {
      const futureTimestamp = this.addHours(lastData.timestamp, i + 1);
      const futureDate = new Date(futureTimestamp);
      
      const futureFeatures = [
        futureDate.getHours(),
        futureDate.getDay(),
        futureDate.getMonth(),
        futureDate.getDay() === 0 || futureDate.getDay() === 6 ? 1 : 0,
        lastData.value,
        data[Math.max(0, data.length - 24)].value,
        data[Math.max(0, data.length - 168)].value,
        lastData.movingAvg24,
        lastData.movingAvg168
      ];
      
      // Predict using ensemble of trees
      const predictions = trees.map(tree => this.predictWithTree(tree, futureFeatures));
      const prediction = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
      
      forecast.push({
        hour: i,
        timestamp: futureTimestamp,
        value: Math.max(0, prediction),
        method: 'RandomForest'
      });
      
      // Update for next iteration
      lastData = {
        ...lastData,
        timestamp: futureTimestamp,
        value: prediction
      };
    }
    
    this.parameters = {
      num_trees: trees.length,
      feature_count: futureFeatures.length
    };
    
    return forecast;
  }

  async ensembleForecast(data, horizon) {
    console.log('Generating Ensemble forecast...');
    
    // Generate forecasts from multiple algorithms
    const arimaForecast = await this.arimaForecast(data, horizon);
    const lstmForecast = await this.lstmForecast(data, horizon);
    const prophetForecast = await this.prophetForecast(data, horizon);
    
    // Combine forecasts with weights
    const weights = { ARIMA: 0.4, LSTM: 0.3, Prophet: 0.3 };
    
    const ensemble = [];
    
    for (let i = 0; i < horizon; i++) {
      const arimaValue = arimaForecast[i].value;
      const lstmValue = lstmForecast[i].value;
      const prophetValue = prophetForecast[i].value;
      
      const ensembleValue = (
        arimaValue * weights.ARIMA +
        lstmValue * weights.LSTM +
        prophetValue * weights.Prophet
      );
      
      ensemble.push({
        hour: i,
        timestamp: arimaForecast[i].timestamp,
        value: ensembleValue,
        method: 'Ensemble',
        components: {
          arima: arimaValue,
          lstm: lstmValue,
          prophet: prophetValue
        }
      });
    }
    
    this.parameters = {
      weights: weights,
      component_algorithms: ['ARIMA', 'LSTM', 'Prophet']
    };
    
    return ensemble;
  }

  // Utility methods
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  calculateSeasonality(values, period) {
    const seasonality = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    
    for (let i = 0; i < values.length; i++) {
      const seasonIndex = i % period;
      seasonality[seasonIndex] += values[i];
      counts[seasonIndex]++;
    }
    
    // Calculate averages
    for (let i = 0; i < period; i++) {
      if (counts[i] > 0) {
        seasonality[i] = seasonality[i] / counts[i];
      }
    }
    
    // Remove overall mean
    const mean = seasonality.reduce((sum, val) => sum + val, 0) / period;
    return seasonality.map(val => val - mean);
  }

  addConfidenceIntervals(forecast, historicalData) {
    const values = historicalData.map(point => point.value);
    const std = this.calculateStandardDeviation(values);
    
    return forecast.map(point => ({
      ...point,
      confidence_interval: {
        lower: point.value - 1.96 * std,
        upper: point.value + 1.96 * std,
        std: std
      }
    }));
  }

  calculateMetrics(forecast, historicalData) {
    // Calculate metrics based on last portion of historical data
    const testSize = Math.min(48, Math.floor(historicalData.length * 0.2));
    const testData = historicalData.slice(-testSize);
    const testForecast = forecast.slice(0, testSize);
    
    let mae = 0, mape = 0, rmse = 0;
    
    for (let i = 0; i < Math.min(testData.length, testForecast.length); i++) {
      const actual = testData[i].value;
      const predicted = testForecast[i].value;
      
      const error = Math.abs(actual - predicted);
      mae += error;
      mape += (error / Math.abs(actual)) * 100;
      rmse += Math.pow(error, 2);
    }
    
    const n = Math.min(testData.length, testForecast.length);
    
    return {
      mae: mae / n,
      mape: mape / n,
      rmse: Math.sqrt(rmse / n),
      accuracy: Math.max(0, 100 - (mape / n))
    };
  }

  assessDataQuality(data) {
    const values = data.map(point => point.value);
    const nullCount = values.filter(v => v === null || v === undefined || isNaN(v)).length;
    const std = this.calculateStandardDeviation(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return {
      completeness: ((data.length - nullCount) / data.length) * 100,
      variability: (std / mean) * 100,
      data_points: data.length,
      quality_score: Math.max(0, 100 - (nullCount / data.length) * 100)
    };
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  addHours(timestamp, hours) {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }

  // Simplified implementations for demo purposes
  generateLSTMWeights(length) {
    return Array.from({ length }, () => Math.random() * 0.1 + 0.9);
  }

  getSeasonalComponent(values, index, period) {
    const seasonalIdx = index % period;
    const seasonality = this.calculateSeasonality(values, period);
    return seasonality[seasonalIdx] || 0;
  }

  extractTrend(values) {
    // Simple linear trend extraction
    return values.map((_, i) => this.calculateTrend(values.slice(0, i + 1)) * i);
  }

  extractSeasonality(values, timestamps) {
    // Simplified seasonal extraction
    return this.calculateSeasonality(values, 24);
  }

  calculateResiduals(values, trend, seasonal) {
    return values.map((val, i) => val - (trend[i] || 0) - (seasonal[i % seasonal.length] || 0));
  }

  projectTrend(trend, steps) {
    if (trend.length === 0) return 0;
    const lastTrend = trend[trend.length - 1];
    const trendSlope = trend.length > 1 ? trend[trend.length - 1] - trend[trend.length - 2] : 0;
    return lastTrend + trendSlope * steps;
  }

  getSeasonalValue(date) {
    // Simplified seasonal value based on hour of day
    const hour = date.getHours();
    const seasonalPattern = [
      0.7, 0.6, 0.5, 0.5, 0.6, 0.8, 1.2, 1.5, 1.3, 1.1,
      1.0, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1, 1.3, 1.4, 1.3,
      1.2, 1.1, 1.0, 0.8
    ];
    return seasonalPattern[hour] || 1.0;
  }

  sampleResiduals(residuals) {
    if (residuals.length === 0) return 0;
    const randomIndex = Math.floor(Math.random() * residuals.length);
    return residuals[randomIndex];
  }

  trainRandomForestTrees(features, targets, numTrees) {
    // Simplified random forest training
    const trees = [];
    for (let i = 0; i < numTrees; i++) {
      trees.push(this.trainSingleTree(features, targets));
    }
    return trees;
  }

  trainSingleTree(features, targets) {
    // Simplified decision tree
    return {
      feature_weights: features[0].map(() => Math.random()),
      bias: Math.random() * targets.reduce((sum, val) => sum + val, 0) / targets.length
    };
  }

  predictWithTree(tree, features) {
    let prediction = tree.bias;
    for (let i = 0; i < features.length && i < tree.feature_weights.length; i++) {
      prediction += features[i] * tree.feature_weights[i];
    }
    return prediction;
  }
}