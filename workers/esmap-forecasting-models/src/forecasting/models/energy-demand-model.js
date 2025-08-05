/**
 * Energy Demand Model
 * Specialized forecasting for energy demand patterns
 */

export class EnergyDemandModel {
  constructor() {
    this.modelType = 'energy-demand';
    this.factors = {
      temperature: 0.15,
      economic_activity: 0.25,
      population: 0.10,
      industrial_activity: 0.30,
      seasonal: 0.20
    };
  }

  async forecastDemand({ data, horizon, country, factors = {} }) {
    console.log(`Generating energy demand forecast for ${country}...`);

    // Validate and preprocess data
    const processedData = this.preprocessDemandData(data, factors);

    // Apply country-specific adjustments
    const countryAdjustments = this.getCountryAdjustments(country);

    // Generate base demand forecast
    const baseForecast = this.generateBaseDemandForecast(processedData, horizon);

    // Apply external factors
    const adjustedForecast = this.applyExternalFactors(baseForecast, factors, countryAdjustments);

    // Add demand-specific patterns
    const finalForecast = this.addDemandPatterns(adjustedForecast, country);

    return {
      forecast: finalForecast,
      model_type: 'energy-demand',
      country: country,
      factors_applied: Object.keys(factors),
      accuracy_estimate: this.estimateAccuracy(country, factors),
      confidence_level: this.calculateConfidenceLevel(processedData, factors)
    };
  }

  preprocessDemandData(data, factors) {
    return data.map((point, index) => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const month = date.getMonth();

      return {
        ...point,
        // Time-based features
        hour: hour,
        dayOfWeek: dayOfWeek,
        month: month,
        quarter: Math.floor(month / 3),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isBusinessHour: hour >= 8 && hour <= 18 && !this.isWeekend,
        
        // Demand-specific features
        heating_degree_days: this.calculateHeatingDegreeDays(factors.temperature || 20),
        cooling_degree_days: this.calculateCoolingDegreeDays(factors.temperature || 20),
        economic_factor: factors.economic_activity || 1.0,
        
        // Historical patterns
        lag1: index > 0 ? data[index - 1].value : point.value,
        lag24: index >= 24 ? data[index - 24].value : point.value,
        lag168: index >= 168 ? data[index - 168].value : point.value,
        
        // Moving averages for trend detection
        ma24: this.calculateMovingAverage(data, index, 24),
        ma168: this.calculateMovingAverage(data, index, 168),
        
        // Demand volatility
        volatility: this.calculateVolatility(data, index, 24)
      };
    });
  }

  getCountryAdjustments(country) {
    const adjustments = {
      // Developed countries
      'USA': { base_load: 1.2, peak_ratio: 1.8, seasonal_variation: 0.3 },
      'DEU': { base_load: 1.0, peak_ratio: 1.6, seasonal_variation: 0.4 },
      'JPN': { base_load: 1.1, peak_ratio: 1.7, seasonal_variation: 0.35 },
      'GBR': { base_load: 0.9, peak_ratio: 1.5, seasonal_variation: 0.25 },
      'FRA': { base_load: 1.0, peak_ratio: 1.6, seasonal_variation: 0.3 },
      
      // Developing countries
      'IND': { base_load: 0.8, peak_ratio: 2.2, seasonal_variation: 0.5 },
      'CHN': { base_load: 1.3, peak_ratio: 2.0, seasonal_variation: 0.4 },
      'BRA': { base_load: 0.7, peak_ratio: 1.9, seasonal_variation: 0.3 },
      'ZAF': { base_load: 0.6, peak_ratio: 2.1, seasonal_variation: 0.2 },
      'MEX': { base_load: 0.5, peak_ratio: 2.0, seasonal_variation: 0.35 },
      
      // Default for unknown countries
      'default': { base_load: 1.0, peak_ratio: 1.7, seasonal_variation: 0.3 }
    };

    return adjustments[country] || adjustments['default'];
  }

  generateBaseDemandForecast(data, horizon) {
    const forecast = [];
    const recentData = data.slice(-Math.min(168, data.length)); // Last week
    
    // Calculate base demand patterns
    const hourlyPattern = this.extractHourlyPattern(recentData);
    const dailyPattern = this.extractDailyPattern(recentData);
    const weeklyTrend = this.calculateTrend(recentData.map(d => d.value));
    
    for (let i = 0; i < horizon; i++) {
      const futureTimestamp = this.addHours(data[data.length - 1].timestamp, i + 1);
      const futureDate = new Date(futureTimestamp);
      
      const hour = futureDate.getHours();
      const dayOfWeek = futureDate.getDay();
      
      // Base demand calculation
      const baseDemand = this.calculateBaseDemand(recentData);
      const hourlyMultiplier = hourlyPattern[hour] || 1.0;
      const dailyMultiplier = dailyPattern[dayOfWeek] || 1.0;
      const trendComponent = weeklyTrend * (i / 168); // Weekly trend application
      
      const demandValue = baseDemand * hourlyMultiplier * dailyMultiplier + trendComponent;
      
      forecast.push({
        hour: i,
        timestamp: futureTimestamp,
        value: Math.max(0, demandValue),
        components: {
          base: baseDemand,
          hourly: hourlyMultiplier,
          daily: dailyMultiplier,
          trend: trendComponent
        }
      });
    }
    
    return forecast;
  }

  applyExternalFactors(forecast, factors, countryAdjustments) {
    return forecast.map(point => {
      let adjustedValue = point.value;
      const date = new Date(point.timestamp);
      
      // Temperature effects
      if (factors.temperature !== undefined) {
        const tempEffect = this.calculateTemperatureEffect(factors.temperature, date.getMonth());
        adjustedValue *= (1 + tempEffect);
      }
      
      // Economic activity effects
      if (factors.economic_activity !== undefined) {
        const economicEffect = (factors.economic_activity - 1.0) * this.factors.economic_activity;
        adjustedValue *= (1 + economicEffect);
      }
      
      // Industrial activity (weekday effect)
      if (factors.industrial_activity !== undefined && !this.isWeekend(date)) {
        const industrialEffect = (factors.industrial_activity - 1.0) * this.factors.industrial_activity;
        adjustedValue *= (1 + industrialEffect);
      }
      
      // Holiday effects
      if (factors.holidays && factors.holidays.includes(point.timestamp.split('T')[0])) {
        adjustedValue *= 0.7; // Reduced demand on holidays
      }
      
      // Country-specific adjustments
      adjustedValue *= countryAdjustments.base_load;
      
      // Peak hour amplification
      const hour = date.getHours();
      if (this.isPeakHour(hour)) {
        adjustedValue *= countryAdjustments.peak_ratio;
      }
      
      return {
        ...point,
        value: Math.max(0, adjustedValue),
        adjustments: {
          temperature: factors.temperature,
          economic: factors.economic_activity,
          industrial: factors.industrial_activity,
          country_base: countryAdjustments.base_load
        }
      };
    });
  }

  addDemandPatterns(forecast, country) {
    return forecast.map(point => {
      const date = new Date(point.timestamp);
      let patternedValue = point.value;
      
      // Add demand-specific volatility
      const volatility = this.getDemandVolatility(country, date);
      const randomComponent = (Math.random() - 0.5) * volatility * patternedValue;
      patternedValue += randomComponent;
      
      // Add load following patterns (rapid changes)
      if (this.isRampPeriod(date)) {
        const rampMultiplier = this.getRampMultiplier(date);
        patternedValue *= rampMultiplier;
      }
      
      // Add minimum load constraints
      const minLoad = this.getMinimumLoad(country, point.value);
      patternedValue = Math.max(minLoad, patternedValue);
      
      return {
        ...point,
        value: patternedValue,
        patterns: {
          volatility: volatility,
          minimum_load: minLoad,
          is_ramp_period: this.isRampPeriod(date)
        }
      };
    });
  }

  // Utility methods
  calculateHeatingDegreeDays(temperature) {
    const baseTemp = 18; // 18°C base temperature
    return Math.max(0, baseTemp - temperature);
  }

  calculateCoolingDegreeDays(temperature) {
    const baseTemp = 22; // 22°C base temperature  
    return Math.max(0, temperature - baseTemp);
  }

  calculateMovingAverage(data, currentIndex, window) {
    const start = Math.max(0, currentIndex - window + 1);
    const end = currentIndex + 1;
    const subset = data.slice(start, end);
    
    const sum = subset.reduce((total, point) => total + (point.value || 0), 0);
    return sum / subset.length;
  }

  calculateVolatility(data, currentIndex, window) {
    if (currentIndex < window) return 0;
    
    const subset = data.slice(currentIndex - window, currentIndex);
    const values = subset.map(point => point.value || 0);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  extractHourlyPattern(data) {
    const hourlyData = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    data.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      hourlyData[hour] += point.value;
      hourlyCounts[hour]++;
    });
    
    // Calculate averages and normalize
    const hourlyAverages = hourlyData.map((sum, hour) => 
      hourlyCounts[hour] > 0 ? sum / hourlyCounts[hour] : 0
    );
    
    const overallMean = hourlyAverages.reduce((sum, val) => sum + val, 0) / 24;
    
    return hourlyAverages.map(avg => overallMean > 0 ? avg / overallMean : 1.0);
  }

  extractDailyPattern(data) {
    const dailyData = new Array(7).fill(0);
    const dailyCounts = new Array(7).fill(0);
    
    data.forEach(point => {
      const dayOfWeek = new Date(point.timestamp).getDay();
      dailyData[dayOfWeek] += point.value;
      dailyCounts[dayOfWeek]++;
    });
    
    // Calculate averages and normalize
    const dailyAverages = dailyData.map((sum, day) => 
      dailyCounts[day] > 0 ? sum / dailyCounts[day] : 0
    );
    
    const overallMean = dailyAverages.reduce((sum, val) => sum + val, 0) / 7;
    
    return dailyAverages.map(avg => overallMean > 0 ? avg / overallMean : 1.0);
  }

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
    return slope || 0;
  }

  calculateBaseDemand(data) {
    const values = data.map(point => point.value);
    
    // Use median as base to avoid outlier effects
    const sortedValues = values.sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    
    return median;
  }

  calculateTemperatureEffect(temperature, month) {
    // Temperature effects vary by season
    const seasonalSensitivity = [0.3, 0.3, 0.2, 0.1, 0.05, 0.02, 0.02, 0.02, 0.05, 0.1, 0.2, 0.3];
    const sensitivity = seasonalSensitivity[month] || 0.1;
    
    // Heating effect (lower temps increase demand)
    if (temperature < 15) {
      return (15 - temperature) * sensitivity * 0.05;
    }
    
    // Cooling effect (higher temps increase demand)
    if (temperature > 25) {
      return (temperature - 25) * sensitivity * 0.03;
    }
    
    return 0;
  }

  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  isPeakHour(hour) {
    // Typical peak hours: morning (7-9) and evening (17-21)
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21);
  }

  getDemandVolatility(country, date) {
    const baseVolatility = {
      'USA': 0.05,
      'DEU': 0.03,
      'IND': 0.12,
      'CHN': 0.08,
      'default': 0.06
    };
    
    const countryVolatility = baseVolatility[country] || baseVolatility['default'];
    
    // Higher volatility during peak hours
    if (this.isPeakHour(date.getHours())) {
      return countryVolatility * 1.5;
    }
    
    return countryVolatility;
  }

  isRampPeriod(date) {
    const hour = date.getHours();
    // Morning and evening ramp periods
    return (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19);
  }

  getRampMultiplier(date) {
    const hour = date.getHours();
    
    // Morning ramp up
    if (hour >= 6 && hour <= 8) {
      return 1.0 + (hour - 6) * 0.15; // 15% increase per hour
    }
    
    // Evening ramp up
    if (hour >= 17 && hour <= 19) {
      return 1.0 + (hour - 17) * 0.10; // 10% increase per hour
    }
    
    return 1.0;
  }

  getMinimumLoad(country, baseValue) {
    const minLoadRatios = {
      'USA': 0.4,
      'DEU': 0.45,
      'IND': 0.3,
      'CHN': 0.35,
      'default': 0.4
    };
    
    const ratio = minLoadRatios[country] || minLoadRatios['default'];
    return baseValue * ratio;
  }

  estimateAccuracy(country, factors) {
    let baseAccuracy = 85; // Base accuracy percentage
    
    // Country-specific accuracy adjustments
    const countryAccuracy = {
      'USA': 88,
      'DEU': 90,
      'GBR': 87,
      'JPN': 89,
      'IND': 78,
      'CHN': 82,
      'BRA': 80,
      'default': 85
    };
    
    baseAccuracy = countryAccuracy[country] || countryAccuracy['default'];
    
    // Adjust based on available factors
    if (factors.temperature !== undefined) baseAccuracy += 2;
    if (factors.economic_activity !== undefined) baseAccuracy += 1;
    if (factors.industrial_activity !== undefined) baseAccuracy += 1;
    if (factors.holidays) baseAccuracy += 1;
    
    return Math.min(95, Math.max(70, baseAccuracy));
  }

  calculateConfidenceLevel(data, factors) {
    let confidence = 0.8; // Base confidence
    
    // More data increases confidence
    if (data.length > 168) confidence += 0.1; // More than 1 week
    if (data.length > 720) confidence += 0.05; // More than 1 month
    
    // External factors increase confidence
    const factorCount = Object.keys(factors).length;
    confidence += factorCount * 0.02;
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  addHours(timestamp, hours) {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }
}