/**
 * Data Processor
 * Handles historical energy data processing and validation
 */

export class DataProcessor {
  constructor(env) {
    this.env = env;
    this.supportedFormats = ['json', 'csv', 'time_series'];
    this.requiredFields = ['timestamp', 'value', 'country'];
  }

  async processHistoricalData(uploadData) {
    const {
      data,
      format = 'json',
      data_type = 'energy_demand',
      country,
      source = 'user_upload',
      validate_quality = true
    } = uploadData;

    console.log(`Processing ${format} data for ${country}...`);

    // Validate input format
    this.validateInputFormat(data, format);

    // Parse data based on format
    const parsedData = await this.parseData(data, format);

    // Validate data quality
    let qualityMetrics = null;
    if (validate_quality) {
      qualityMetrics = await this.validateDataQuality(parsedData, data_type, country);
    }

    // Clean and standardize data
    const cleanedData = await this.cleanData(parsedData);

    // Engineer additional features
    const enrichedData = await this.enrichData(cleanedData, data_type, country);

    // Store data quality metrics
    if (qualityMetrics) {
      await this.storeQualityMetrics(qualityMetrics, source, country, data_type);
    }

    return {
      processed_data: enrichedData,
      quality_metrics: qualityMetrics,
      data_summary: {
        total_points: enrichedData.length,
        date_range: {
          start: enrichedData[0]?.timestamp,
          end: enrichedData[enrichedData.length - 1]?.timestamp
        },
        countries: [...new Set(enrichedData.map(point => point.country))],
        data_type: data_type,
        source: source
      }
    };
  }

  validateInputFormat(data, format) {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported data format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    if (!data) {
      throw new Error('No data provided');
    }

    if (format === 'json' && !Array.isArray(data)) {
      throw new Error('JSON data must be an array');
    }

    if (format === 'csv' && typeof data !== 'string') {
      throw new Error('CSV data must be a string');
    }
  }

  async parseData(data, format) {
    switch (format) {
      case 'json':
        return this.parseJSONData(data);
      
      case 'csv':
        return this.parseCSVData(data);
      
      case 'time_series':
        return this.parseTimeSeriesData(data);
      
      default:
        throw new Error(`Parser not implemented for format: ${format}`);
    }
  }

  parseJSONData(data) {
    // Validate required fields
    if (data.length === 0) {
      throw new Error('Empty data array');
    }

    const firstPoint = data[0];
    for (const field of this.requiredFields) {
      if (!(field in firstPoint)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return data.map(point => ({
      timestamp: new Date(point.timestamp).toISOString(),
      value: parseFloat(point.value),
      country: point.country,
      unit: point.unit || 'MW',
      source: point.source || 'unknown',
      quality: point.quality || 'unverified',
      metadata: point.metadata || {}
    }));
  }

  parseCSVData(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain header and data rows');
    }

    // Parse header
    const header = lines[0].split(',').map(col => col.trim());
    const dataPoints = [];

    // Validate required columns
    const requiredColumns = ['timestamp', 'value', 'country'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required CSV columns: ${missingColumns.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(val => val.trim());
      if (values.length !== header.length) {
        console.warn(`Row ${i + 1} has ${values.length} columns, expected ${header.length}`);
        continue;
      }

      const point = {};
      header.forEach((col, index) => {
        point[col] = values[index];
      });

      dataPoints.push({
        timestamp: new Date(point.timestamp).toISOString(),
        value: parseFloat(point.value),
        country: point.country,
        unit: point.unit || 'MW',
        source: point.source || 'csv_upload',
        quality: point.quality || 'unverified',
        metadata: {}
      });
    }

    return dataPoints;
  }

  parseTimeSeriesData(data) {
    // Expect format: { timestamps: [], values: [], country: "", metadata: {} }
    if (!data.timestamps || !data.values || !data.country) {
      throw new Error('Time series data must contain timestamps, values, and country');
    }

    if (data.timestamps.length !== data.values.length) {
      throw new Error('Timestamps and values arrays must have the same length');
    }

    return data.timestamps.map((timestamp, index) => ({
      timestamp: new Date(timestamp).toISOString(),
      value: parseFloat(data.values[index]),
      country: data.country,
      unit: data.unit || 'MW',
      source: data.source || 'time_series_upload',
      quality: 'unverified',
      metadata: data.metadata || {}
    }));
  }

  async validateDataQuality(data, dataType, country) {
    console.log(`Validating data quality for ${data.length} points...`);

    const metrics = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      overall_score: 0,
      issues: [],
      recommendations: []
    };

    // Completeness check
    const nullValues = data.filter(point => 
      point.value === null || point.value === undefined || isNaN(point.value)
    ).length;
    metrics.completeness = Math.max(0, (1 - nullValues / data.length) * 100);

    if (metrics.completeness < 95) {
      metrics.issues.push(`${nullValues} missing or invalid values detected`);
      metrics.recommendations.push('Consider data imputation or filtering');
    }

    // Accuracy check (outlier detection)
    const values = data.filter(point => !isNaN(point.value)).map(point => point.value);
    const outliers = this.detectOutliers(values);
    metrics.accuracy = Math.max(0, (1 - outliers.length / values.length) * 100);

    if (outliers.length > values.length * 0.05) {
      metrics.issues.push(`${outliers.length} potential outliers detected`);
      metrics.recommendations.push('Review outlier values for data quality');
    }

    // Consistency check (temporal consistency)
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const timeGaps = this.findTimeGaps(sortedData);
    metrics.consistency = Math.max(0, 100 - (timeGaps.length / sortedData.length) * 100);

    if (timeGaps.length > 0) {
      metrics.issues.push(`${timeGaps.length} time gaps detected in data series`);
      metrics.recommendations.push('Consider interpolation for missing time periods');
    }

    // Timeliness check (how recent is the data)
    const latestTimestamp = new Date(Math.max(...data.map(point => new Date(point.timestamp))));
    const ageInDays = (Date.now() - latestTimestamp.getTime()) / (1000 * 60 * 60 * 24);
    metrics.timeliness = Math.max(0, 100 - Math.min(ageInDays, 100));

    if (ageInDays > 30) {
      metrics.issues.push(`Data is ${Math.floor(ageInDays)} days old`);
      metrics.recommendations.push('Consider updating with more recent data');
    }

    // Overall quality score
    metrics.overall_score = (
      metrics.completeness * 0.3 +
      metrics.accuracy * 0.3 +
      metrics.consistency * 0.25 +
      metrics.timeliness * 0.15
    );

    // Add data type specific validations
    if (dataType === 'energy_demand') {
      this.validateEnergyDemandData(data, metrics);
    } else if (dataType === 'renewable_supply') {
      this.validateRenewableSupplyData(data, metrics);
    }

    return metrics;
  }

  validateEnergyDemandData(data, metrics) {
    // Check for realistic demand values
    const values = data.map(point => point.value).filter(val => !isNaN(val));
    const unrealisticValues = values.filter(val => val < 0 || val > 1000000); // 0-1TW range

    if (unrealisticValues.length > 0) {
      metrics.issues.push(`${unrealisticValues.length} unrealistic demand values detected`);
      metrics.recommendations.push('Review demand values for unit consistency');
    }

    // Check for typical demand patterns
    const hourlyPattern = this.analyzeHourlyPattern(data);
    if (!hourlyPattern.hasTypicalPattern) {
      metrics.issues.push('Data does not show typical daily demand patterns');
      metrics.recommendations.push('Verify data represents actual energy demand');
    }
  }

  validateRenewableSupplyData(data, metrics) {
    // Check for realistic generation values
    const values = data.map(point => point.value).filter(val => !isNaN(val));
    const negativeValues = values.filter(val => val < 0);

    if (negativeValues.length > 0) {
      metrics.issues.push(`${negativeValues.length} negative generation values detected`);
      metrics.recommendations.push('Generation values should be non-negative');
    }

    // Check for solar/wind patterns if metadata indicates
    const hasWeatherPattern = this.analyzeWeatherPattern(data);
    if (!hasWeatherPattern) {
      metrics.issues.push('Data does not show typical renewable generation patterns');
      metrics.recommendations.push('Verify data represents renewable energy generation');
    }
  }

  detectOutliers(values) {
    if (values.length === 0) return [];

    // Use IQR method
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(val => val < lowerBound || val > upperBound);
  }

  findTimeGaps(sortedData) {
    const gaps = [];
    
    for (let i = 1; i < sortedData.length; i++) {
      const prevTime = new Date(sortedData[i - 1].timestamp);
      const currTime = new Date(sortedData[i].timestamp);
      const diffHours = (currTime - prevTime) / (1000 * 60 * 60);
      
      // Consider gaps > 2 hours as significant
      if (diffHours > 2) {
        gaps.push({
          start: sortedData[i - 1].timestamp,
          end: sortedData[i].timestamp,
          gap_hours: diffHours
        });
      }
    }
    
    return gaps;
  }

  analyzeHourlyPattern(data) {
    // Check if data shows typical daily patterns
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    data.forEach(point => {
      if (!isNaN(point.value)) {
        const hour = new Date(point.timestamp).getHours();
        hourlyAverages[hour] += point.value;
        hourlyCounts[hour]++;
      }
    });

    // Calculate averages
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] = hourlyAverages[i] / hourlyCounts[i];
      }
    }

    // Check for typical peak/off-peak patterns
    const peakHours = [8, 9, 18, 19, 20]; // Typical demand peaks
    const offPeakHours = [2, 3, 4, 5]; // Typical demand lows

    const peakAvg = peakHours.reduce((sum, hour) => sum + hourlyAverages[hour], 0) / peakHours.length;
    const offPeakAvg = offPeakHours.reduce((sum, hour) => sum + hourlyAverages[hour], 0) / offPeakHours.length;

    // Should have at least 20% difference between peak and off-peak
    const hasTypicalPattern = peakAvg > offPeakAvg * 1.2;

    return { hasTypicalPattern, peakAvg, offPeakAvg };
  }

  analyzeWeatherPattern(data) {
    // Simplified weather pattern detection
    // In production, this would be more sophisticated
    const values = data.map(point => point.value).filter(val => !isNaN(val));
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Renewable sources typically show weather-related variance
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    return coefficientOfVariation > 0.2; // Expect some weather-related variability
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  async cleanData(data) {
    console.log('Cleaning and standardizing data...');

    let cleanedData = [...data];

    // Sort by timestamp
    cleanedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Remove duplicates
    cleanedData = this.removeDuplicates(cleanedData);

    // Handle missing values
    cleanedData = this.handleMissingValues(cleanedData);

    // Standardize units
    cleanedData = this.standardizeUnits(cleanedData);

    // Remove outliers (optional, based on configuration)
    cleanedData = this.removeOutliers(cleanedData, 3); // 3 standard deviations

    return cleanedData;
  }

  removeDuplicates(data) {
    const seen = new Set();
    return data.filter(point => {
      const key = `${point.timestamp}_${point.country}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  handleMissingValues(data) {
    // Simple linear interpolation for missing values
    for (let i = 1; i < data.length - 1; i++) {
      if (isNaN(data[i].value) || data[i].value === null) {
        // Find nearest non-null values
        let prevIndex = i - 1;
        let nextIndex = i + 1;

        while (prevIndex >= 0 && (isNaN(data[prevIndex].value) || data[prevIndex].value === null)) {
          prevIndex--;
        }

        while (nextIndex < data.length && (isNaN(data[nextIndex].value) || data[nextIndex].value === null)) {
          nextIndex++;
        }

        if (prevIndex >= 0 && nextIndex < data.length) {
          // Linear interpolation
          const prevValue = data[prevIndex].value;
          const nextValue = data[nextIndex].value;
          const steps = nextIndex - prevIndex;
          const stepSize = (nextValue - prevValue) / steps;
          
          data[i].value = prevValue + stepSize * (i - prevIndex);
          data[i].quality = 'interpolated';
        }
      }
    }

    return data.filter(point => !isNaN(point.value) && point.value !== null);
  }

  standardizeUnits(data) {
    // Convert all energy values to MW
    return data.map(point => {
      let value = point.value;
      const unit = (point.unit || 'MW').toUpperCase();

      switch (unit) {
        case 'KW':
          value = value / 1000;
          break;
        case 'GW':
          value = value * 1000;
          break;
        case 'TW':
          value = value * 1000000;
          break;
        case 'MW':
        default:
          // Already in MW
          break;
      }

      return {
        ...point,
        value: value,
        unit: 'MW',
        original_unit: point.unit || 'MW'
      };
    });
  }

  removeOutliers(data, threshold = 3) {
    const values = data.map(point => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    return data.filter(point => {
      const zScore = Math.abs((point.value - mean) / std);
      return zScore <= threshold;
    });
  }

  async enrichData(data, dataType, country) {
    console.log('Enriching data with additional features...');

    return data.map((point, index) => {
      const date = new Date(point.timestamp);
      
      return {
        ...point,
        // Time-based features
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        dayOfYear: this.getDayOfYear(date),
        month: date.getMonth(),
        quarter: Math.floor(date.getMonth() / 3),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHoliday: this.isHoliday(date, country),
        
        // Lag features
        lag1h: index > 0 ? data[index - 1].value : point.value,
        lag24h: index >= 24 ? data[index - 24].value : point.value,
        lag168h: index >= 168 ? data[index - 168].value : point.value,
        
        // Rolling averages
        ma24h: this.calculateMovingAverage(data, index, 24),
        ma168h: this.calculateMovingAverage(data, index, 168),
        
        // Seasonality
        seasonal_component: this.calculateSeasonalComponent(data, index, 24),
        
        // Data type specific features
        ...this.getDataTypeSpecificFeatures(point, dataType, date)
      };
    });
  }

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  isHoliday(date, country) {
    // Simplified holiday detection (would need proper holiday database)
    const month = date.getMonth();
    const day = date.getDate();
    
    // Universal holidays
    if ((month === 0 && day === 1) || (month === 11 && day === 25)) {
      return true;
    }
    
    return false;
  }

  calculateMovingAverage(data, currentIndex, window) {
    const start = Math.max(0, currentIndex - window + 1);
    const end = currentIndex + 1;
    const subset = data.slice(start, end);
    
    const sum = subset.reduce((total, point) => total + (point.value || 0), 0);
    return sum / subset.length;
  }

  calculateSeasonalComponent(data, currentIndex, period) {
    const seasonalData = [];
    
    for (let i = currentIndex; i >= 0; i -= period) {
      if (data[i]) {
        seasonalData.push(data[i].value || 0);
      }
    }
    
    if (seasonalData.length === 0) return 0;
    
    return seasonalData.reduce((sum, val) => sum + val, 0) / seasonalData.length;
  }

  getDataTypeSpecificFeatures(point, dataType, date) {
    const features = {};
    
    if (dataType === 'energy_demand') {
      features.is_peak_hour = this.isPeakHour(date.getHours());
      features.business_day_factor = this.getBusinessDayFactor(date);
    } else if (dataType === 'renewable_supply') {
      features.is_daylight = this.isDaylight(date.getHours());
      features.season_factor = this.getSeasonFactor(date.getMonth());
    }
    
    return features;
  }

  isPeakHour(hour) {
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 21);
  }

  getBusinessDayFactor(date) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0.7; // Weekend
    return 1.0; // Weekday
  }

  isDaylight(hour) {
    return hour >= 6 && hour <= 18;
  }

  getSeasonFactor(month) {
    // Northern hemisphere seasons
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  async storeQualityMetrics(metrics, source, country, dataType) {
    if (!this.env.DB) return;

    try {
      await this.env.DB.prepare(`
        INSERT INTO data_quality_metrics (
          source_name, country, data_type, quality_score,
          completeness, accuracy, consistency, timeliness,
          data_points, assessed_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).bind(
        source,
        country,
        dataType,
        metrics.overall_score,
        metrics.completeness,
        metrics.accuracy,
        metrics.consistency,
        metrics.timeliness,
        0, // data_points will be updated by caller
        JSON.stringify({
          issues: metrics.issues,
          recommendations: metrics.recommendations
        })
      ).run();
    } catch (error) {
      console.error('Error storing quality metrics:', error);
    }
  }
}